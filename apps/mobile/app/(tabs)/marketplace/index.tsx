import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, Dimensions, useColorScheme, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import clsx from 'clsx';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { useListings, useCategories, useToggleFavorite } from '../../../hooks/useMarketplace';
import { MarketItemCard } from '../../../components/market/MarketItemCard';
import { useTabBarAnimation } from '../../../context/TabBarContext';

// Get screen width
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function MarketplaceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const { data: categories } = useCategories();
    
    // Tab Bar Animation
    const { tabBarTranslateY } = useTabBarAnimation();
    const lastContentOffset = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentOffset = event.contentOffset.y;
            const diff = currentOffset - lastContentOffset.value;

            // Ignore bounces
            if (currentOffset <= 0 || currentOffset > event.contentSize.height - event.layoutMeasurement.height) {
                lastContentOffset.value = currentOffset;
                return;
            }

            if (Math.abs(diff) < 10) return;

            if (diff > 0) {
                // Scrolling Down -> Hide
                if (tabBarTranslateY.value !== 100) {
                    tabBarTranslateY.value = withTiming(100, { duration: 300 });
                }
            } else {
                // Scrolling Up -> Show
                if (tabBarTranslateY.value !== 0) {
                    tabBarTranslateY.value = withTiming(0, { duration: 300 });
                }
            }
            lastContentOffset.value = currentOffset;
        },
    });
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { 
        data, 
        fetchNextPage, 
        hasNextPage, 
        isFetchingNextPage, 
        isLoading, 
        refetch, 
        isRefetching
    } = useListings({ 
        category: selectedCategory, 
        search: debouncedSearch 
    });

    const listings = data?.pages.flatMap(page => page) || [];

    const toggleFavoriteMutation = useToggleFavorite();

    const handleToggleFavorite = (id: string) => {
        toggleFavoriteMutation.mutate(id);
    };

    const handleMessage = (item: any) => {
        if (!item.sellerId) return;
        router.push({
            pathname: '/chat/new',
            params: {
                recipientId: item.sellerId,
                name: item.seller?.name || item.seller?.displayName || 'Seller',
                avatar: item.seller?.avatar || item.seller?.avatarUrl,
                initialMessage: `Hi, I'm interested in your listing: "${item.title}" posted for Kes ${item.price}. Is it still available?`
            }
        } as any);
    };

    const renderItem = ({ item }: { item: any }) => {
        // Parse images if stored as JSON string
        let imageList: string[] = [];
        if (typeof item.images === 'string') {
            try { imageList = JSON.parse(item.images); } catch { imageList = []; }
        } else if (Array.isArray(item.images)) {
            imageList = item.images;
        }
        
        const mappedItem = {
            ...item,
            price: typeof item.price === 'number' ? `Kes ${item.price.toFixed(2)}` : item.price,
            image: imageList.length > 0 ? imageList[0] : 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image',
            location: item.location || null,
            condition: item.condition || 'good',
            isFavorited: item.isFavorited,
            isBookmarked: item.isBookmarked,
            seller: {
                name: item.seller?.displayName || item.seller?.username || 'Seller',
                avatar: item.seller?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.seller?.username || 'U')}&background=random`
            }
        };

        return (
            <View style={{ width: COLUMN_WIDTH, margin: 6 }}>
                <MarketItemCard 
                    item={mappedItem} 
                    onPress={() => router.push(`/marketplace/${item.id}`)} 
                    onToggleFavorite={handleToggleFavorite}
                    onMessage={handleMessage}
                />
            </View>
        );
    };


    // Header Content as a Component to put inside FlatList
    const marketplaceHeader = (
        <View className="px-5 pb-2">
            {/* Search Bar */}
            <View className="flex-row items-center gap-3 mt-2 mb-6">
                <View 
                    className="flex-1 flex-row items-center rounded-2xl px-4 py-3.5 border"
                    style={{ 
                        backgroundColor: isDark ? '#1e2124' : 'white',
                        borderColor: isDark ? '#1f2937' : '#e5e7eb'
                    }}
                >
                    <MaterialIcons name="search" size={22} color="#9CA3AF" />
                    <TextInput 
                        className="flex-1 ml-3 text-base font-medium"
                        style={{ color: isDark ? '#f3f4f6' : '#111818' }}
                        placeholder="Search marketplace..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
                {/* Filter Button */}
                <TouchableOpacity 
                    className="size-12 rounded-2xl items-center justify-center border"
                    style={{ 
                        backgroundColor: isDark ? '#1e2124' : 'white',
                        borderColor: isDark ? '#1f2937' : '#e5e7eb'
                    }}
                    onPress={() => Alert.alert('Filters', 'Advanced filters coming soon!')}
                >
                     <MaterialIcons name="tune" size={24} color="#5eb2ed" />
                </TouchableOpacity>
            </View>

            {/* Categories */}
            <FlatList 
                horizontal
                data={[{id: 'all', name: 'All'}, ...(categories || [])]}
                keyExtractor={item => item.id}
                className="mb-6 -mx-5 px-5"
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isSelected = selectedCategory === item.id || (item.id === 'all' && !selectedCategory);
                    
                    // Logic for colors
                    const bgColor = isSelected 
                        ? (isDark ? 'white' : '#111818') 
                        : (isDark ? '#1e2124' : 'white');
                    
                    const borderColor = isSelected
                        ? (isDark ? 'white' : '#111818')
                        : (isDark ? '#1f2937' : '#e5e7eb');

                    const textColor = isSelected
                        ? (isDark ? '#111818' : 'white')
                        : (isDark ? '#d1d5db' : '#4b5563');

                    return (
                        <TouchableOpacity 
                            onPress={() => setSelectedCategory(item.id === 'all' ? undefined : item.id)}
                            className="px-5 py-2.5 rounded-full mr-2 border"
                            style={{ backgroundColor: bgColor, borderColor: borderColor }}
                        >
                            <Text 
                                className="font-bold text-sm"
                                style={{ color: textColor }}
                            >
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Selling Banner */}
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => router.push({ pathname: '/marketplace/create', params: { categoryName: 'Textbooks' } } as any)}
                className="rounded-3xl p-5 mb-8 flex-row justify-between items-center overflow-hidden relative border shadow-sm"
                style={{
                    backgroundColor: isDark ? '#1e2124' : 'white',
                    borderColor: isDark ? '#1f2937' : '#f3f4f6'
                }}
            >
                <View className="flex-1 z-10">
                    <View className="bg-[#F59E0B] self-start px-2 py-1 rounded-md mb-2">
                        <Text className="text-[10px] font-black uppercase" style={{ color: isDark ? '#111818' : 'white' }}>Students Only</Text>
                    </View>
                    <Text className="text-xl font-black mb-1" style={{ color: isDark ? 'white' : '#111818' }}>Selling textbooks?</Text>
                    <Text className="text-xs font-medium leading-relaxed pr-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        Scan ISBN to auto-fill details instantly.
                    </Text>
                </View>
                <View 
                    className="size-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }}
                >
                    <MaterialIcons name="qr-code-scanner" size={24} color={isDark ? "white" : "#111818"} style={{ opacity: 0.5 }} />
                </View>
                
                {/* Background Decor */}
                <View 
                    className="absolute -right-6 -bottom-6 size-24 rounded-full opacity-50"
                    style={{ backgroundColor: isDark ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff' }}
                />
            </TouchableOpacity>

            {/* Section Header */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold" style={{ color: isDark ? 'white' : '#111818' }}>Fresh Finds</Text>
                <Text className="font-bold text-sm" style={{ color: isDark ? '#5eb2ed' : '#2563eb' }}>2 mi radius</Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: isDark ? '#111818' : '#f9fafb' }}>
            {/* Top Bar */}
            <View 
                style={{ paddingTop: insets.top, backgroundColor: isDark ? '#111818' : '#f9fafb' }} 
                className="px-5 pb-4 flex-row items-center justify-between z-10"
            >
                <Text className="text-3xl font-extrabold" style={{ color: isDark ? 'white' : '#111818' }}>Marketplace</Text>
                <View className="flex-row gap-3">
                    <TouchableOpacity 
                        className="size-10 rounded-full items-center justify-center border"
                        style={{ 
                            backgroundColor: isDark ? '#1e2124' : 'white',
                            borderColor: isDark ? '#1f2937' : '#e5e7eb'
                        }}
                        onPress={() => Alert.alert('View', 'Layout options coming soon!')}
                    >
                        <MaterialIcons name="grid-view" size={20} color={isDark ? "#9CA3AF" : "#111818"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => router.push('/marketplace/manage')}
                        className="size-10 rounded-full items-center justify-center border"
                        style={{ 
                            backgroundColor: isDark ? '#1e2124' : 'white',
                            borderColor: isDark ? '#1f2937' : '#e5e7eb'
                        }}
                    >
                         <MaterialIcons name="person" size={20} color={isDark ? "#9CA3AF" : "#111818"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Feed */}
            {isLoading ? (
                 <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#5eb2ed" />
                </View>
            ) : (
                <AnimatedFlatList
                    ListHeaderComponent={marketplaceHeader}
                    data={listings}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderItem as any}
                    numColumns={2}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    columnWrapperStyle={{ paddingHorizontal: 14 }}
                    onEndReached={() => {
                        if (hasNextPage) fetchNextPage();
                    }}
                    onEndReachedThreshold={0.5}
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-8">
                            <MaterialIcons name="storefront" size={56} color={isDark ? "#374151" : "#D1D5DB"} />
                            <Text className="text-lg font-bold mt-4 mb-1" style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>No items found.</Text>
                            <Text className="text-gray-500 text-center">Try adjusting your filters.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View className="py-4 items-center">
                                <ActivityIndicator color="#5eb2ed" />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* FAB Sell Button */}
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push('/marketplace/create')}
                className="absolute self-center flex-row items-center size-14 rounded-full items-center justify-center shadow-2xl shadow-black/40"
                style={{ bottom: 100, backgroundColor: isDark ? '#5eb2ed' : '#111818' }}
            >
                <MaterialIcons name="add" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
}
