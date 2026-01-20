import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useListings, useDeleteListing, useMarkAsSold } from '../../hooks/useMarketplace';
import { MarketItem } from '../../components/market/MarketItemCard';

export default function ManageListingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
    
    const { 
        data, 
        isLoading, 
        refetch, 
        isRefetching
    } = useListings({ 
        sellerId: user?.id, 
        status: activeTab 
    });

    const listings = data?.pages.flatMap(page => page) || [];
    
    const deleteMutation = useDeleteListing();
    const markSoldMutation = useMarkAsSold();

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Listing",
            "Are you sure you want to delete this listing? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => {
                        deleteMutation.mutate(id, {
                            onSuccess: () => Alert.alert("Success", "Listing deleted")
                        });
                    }
                }
            ]
        );
    };

    const handleMarkSold = (id: string) => {
        Alert.alert(
            "Mark as Sold",
            "This will move the item to your Sold history.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Mark Sold", 
                    onPress: () => {
                        markSoldMutation.mutate(id, {
                            onSuccess: () => Alert.alert("Success", "Listing marked as sold")
                        });
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: MarketItem }) => (
        <View className="flex-row bg-white dark:bg-[#1e2124] p-4 mb-3 rounded-2xl mx-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <Image 
                source={{ uri: item.image || (item as any).images?.[0] || 'https://placehold.co/100' }} 
                className="w-20 h-20 rounded-lg bg-gray-200"
                resizeMode="cover"
            />
            <View className="flex-1 ml-4 justify-between py-1">
                <View>
                    <Text className="font-bold text-[#111818] dark:text-gray-100 text-base" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-gray-500 font-bold text-sm mt-0.5">Kes {item.price}</Text>
                </View>
                
                <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity 
                        onPress={() => handleDelete(item.id)}
                        className="bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                    >
                        <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                        <Text className="text-red-500 text-[11px] font-bold uppercase">Delete</Text>
                    </TouchableOpacity>
                    
                    {activeTab === 'active' && (
                        <TouchableOpacity 
                            onPress={() => handleMarkSold(item.id)}
                            className="bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                        >
                            <MaterialIcons name="check-circle-outline" size={16} color="#16a34a" />
                            <Text className="text-green-600 text-[11px] font-bold uppercase">Sold</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 dark:bg-[#1a1a1a]" style={{ paddingTop: insets.top }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Tabs */}
            <View className="flex-row p-4 gap-3">
                <TouchableOpacity 
                    onPress={() => setActiveTab('active')}
                    className={clsx(
                        "flex-1 py-3 rounded-xl items-center justify-center border",
                        activeTab === 'active' 
                            ? "bg-[#111818] border-[#111818] dark:bg-white dark:border-white" 
                            : "bg-white dark:bg-[#1e2124] border-gray-200 dark:border-gray-700"
                    )}
                >
                    <Text className={clsx("font-bold", activeTab === 'active' ? "text-white dark:text-black" : "text-gray-500")}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setActiveTab('sold')}
                    className={clsx(
                        "flex-1 py-3 rounded-xl items-center justify-center border",
                        activeTab === 'sold' 
                            ? "bg-[#111818] border-[#111818] dark:bg-white dark:border-white" 
                            : "bg-white dark:bg-[#1e2124] border-gray-200 dark:border-gray-700"
                    )}
                >
                    <Text className={clsx("font-bold", activeTab === 'sold' ? "text-white dark:text-black" : "text-gray-500")}>Sold History</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#111818" />
                </View>
            ) : (
                <FlatList 
                    data={listings}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-8">
                            <Text className="text-gray-400 text-center mb-2">No {activeTab} listings found.</Text>
                            {activeTab === 'active' && (
                                <TouchableOpacity onPress={() => router.push('/marketplace/create')}>
                                    <Text className="text-[#0066cc] font-bold">Create one now</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}
        </View>
    );
}
