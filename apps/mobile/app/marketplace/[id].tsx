import React, { useState, useMemo, useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Modal, FlatList, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useListing, useCategories, useToggleFavorite, useToggleBookmark } from '../../hooks/useMarketplace';

const { width } = Dimensions.get('window');

export default function MarketplaceItemDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { data: rawItem, isLoading } = useListing(id as string);
  const { data: categories } = useCategories();
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Mutations
  const toggleFavoriteMutation = useToggleFavorite();
  const toggleBookmarkMutation = useToggleBookmark();

  // Normalize item data
  const item = useMemo(() => {
    if (!rawItem) return null;
    
    // Parse images if stored as JSON string
    let imageList: string[] = [];
    if (typeof rawItem.images === 'string') {
      try { imageList = JSON.parse(rawItem.images); } catch { imageList = []; }
    } else if (Array.isArray(rawItem.images)) {
      imageList = rawItem.images;
    }

    // Get category name from categories list
    const categoryData = categories?.find(c => c.id === rawItem.category || c.name === rawItem.category);
    const categoryName = categoryData?.name || rawItem.category || 'General';
    
    return {
      ...rawItem,
      parsedImages: imageList,
      mainImage: imageList.length > 0 ? imageList[0] : 'https://placehold.co/800x1000/e2e8f0/64748b?text=No+Image',
      sellerName: rawItem.seller?.displayName || rawItem.seller?.username || 'Seller',
      sellerAvatar: rawItem.seller?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rawItem.seller?.username || 'U')}&background=random&size=150`,
      categoryName,
    };
  }, [rawItem, categories]);

  const handleMessageSeller = () => {
    if (!item?.sellerId) return;
    
    // Navigate to new chat with context
    router.push({
      pathname: '/chat/new',
      params: {
        recipientId: item.sellerId,
        name: item.sellerName,
        avatar: item.sellerAvatar,
        initialMessage: `Hi, I'm interested in your listing: "${item.title}" posted for Kes ${item.price}. Is it still available?`
      }
    });
  };

  const handleToggleFavorite = () => {
    if (!id) return;
    toggleFavoriteMutation.mutate(id as string);
  };

  const handleToggleBookmark = () => {
    if (!id) return;
    toggleBookmarkMutation.mutate(id as string);
  };

  const handleShare = async () => {
    if (!item) return;
    
    try {
      await Share.share({
        message: `Check out this listing: ${item.title} - Kes ${item.price}\n\nFind it on UniSocial Marketplace!`,
        title: item.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Image gallery render
  const renderGalleryImage = ({ item: imageUrl }: { item: string }) => (
    <Image 
      source={{ uri: imageUrl }} 
      style={{ width, height: width * 1.25 }}
      resizeMode="cover"
    />
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-[#1a1a1a] items-center justify-center">
        <ActivityIndicator color="#0066cc" />
        <Text className="mt-4 text-gray-500">Loading item...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 bg-white dark:bg-[#1a1a1a] items-center justify-center p-6">
        <Text className="text-lg font-bold dark:text-white">Item not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#0066cc] px-6 py-2 rounded-full">
           <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const galleryImages = item.parsedImages.length > 0 ? item.parsedImages : [item.mainImage];
  const isFavorited = item.isFavorited || false;
  const isBookmarked = item.isBookmarked || false;

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Gallery Section */}
        <View className="relative bg-gray-200 dark:bg-slate-800" style={{ height: width * 1.25 }}>
           <FlatList
             data={galleryImages}
             renderItem={renderGalleryImage}
             keyExtractor={(_, index) => `gallery-${index}`}
             horizontal
             pagingEnabled
             showsHorizontalScrollIndicator={false}
             onViewableItemsChanged={onViewableItemsChanged}
             viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
           />
           
           {/* Pagination Dots */}
           {galleryImages.length > 1 && (
             <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
               {galleryImages.map((_, index) => (
                 <View 
                   key={index}
                   className={`size-2 rounded-full ${index === activeImageIndex ? 'bg-white' : 'bg-white/40'}`}
                 />
               ))}
             </View>
           )}
           
           {/* Header Overlay */}
           <SafeAreaView className="absolute top-0 left-0 right-0 z-50 flex-row justify-between px-4 pt-2">
              <TouchableOpacity onPress={() => router.back()} className="size-10 rounded-full bg-white/90 dark:bg-black/40 items-center justify-center backdrop-blur-md">
                 <MaterialIcons name="arrow-back-ios-new" size={20} color="#111818" />
              </TouchableOpacity>
              <View className="flex-row gap-2">
                 <TouchableOpacity 
                   onPress={handleShare}
                   className="size-10 rounded-full bg-white/90 dark:bg-black/40 items-center justify-center backdrop-blur-md"
                 >
                    <MaterialIcons name="share" size={20} color="#111818" />
                 </TouchableOpacity>
                 <TouchableOpacity 
                   onPress={handleToggleFavorite}
                   disabled={toggleFavoriteMutation.isPending}
                   className="size-10 rounded-full bg-white/90 dark:bg-black/40 items-center justify-center backdrop-blur-md"
                 >
                    <MaterialIcons 
                      name={isFavorited ? "favorite" : "favorite-border"} 
                      size={20} 
                      color="#EF4444" 
                    />
                 </TouchableOpacity>
              </View>
           </SafeAreaView>

           {/* Location Chip */}
           {item.location && (
             <View className="absolute top-28 left-4 bg-[#0066cc] px-3 py-1.5 rounded-full flex-row items-center gap-1 shadow-lg shadow-blue-500/30">
                <MaterialIcons name="location-pin" size={14} color="white" />
                <Text className="text-white text-xs font-bold">{item.location}</Text>
             </View>
           )}

           {/* Image Counter */}
           {galleryImages.length > 1 && (
             <View className="absolute top-28 right-4 bg-black/50 px-2.5 py-1 rounded-full">
               <Text className="text-white text-xs font-bold">{activeImageIndex + 1}/{galleryImages.length}</Text>
             </View>
           )}
        </View>

        <View className="px-5 pt-6">
           {/* Tags */}
           <View className="flex-row items-center gap-2 mb-2">
              {item.seller?.isVerified && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0066cc]/10">
                   <MaterialIcons name="verified" size={12} color="#0066cc" />
                   <Text className="text-[#0066cc] text-[11px] font-bold uppercase tracking-wider">Verified Seller</Text>
                </View>
              )}
              <View className="px-2.5 py-1 rounded-lg bg-green-500/10">
                 <Text className="text-green-600 text-[11px] font-bold uppercase tracking-wider">{item.status === 'active' ? 'Available' : item.status}</Text>
              </View>
           </View>
           
           <Text className="text-2xl font-extrabold text-[#111818] dark:text-white leading-tight mb-2">
              {item.title}
           </Text>
           <Text className="text-3xl font-black text-[#0066cc]">Kes {typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</Text>
           <Text className="text-slate-500 mt-1 text-sm">Condition: <Text className="font-medium text-[#0066cc] capitalize">{item.condition}</Text></Text>

           {/* Specs */}
           <View className="gap-3 mt-8 flex-row">
              <View className="flex-1 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                 <Text className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Condition</Text>
                 <Text className="font-bold text-slate-800 dark:text-gray-200 capitalize">{item.condition}</Text>
              </View>
              <View className="flex-1 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                 <Text className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Category</Text>
                 <Text className="font-bold text-slate-800 dark:text-gray-200 capitalize">{item.categoryName}</Text>
              </View>
           </View>

           {/* Description */}
           {item.description && (
             <View className="mt-8">
                <Text className="text-lg font-bold text-[#111818] dark:text-white mb-3">Product Description</Text>
                <View className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                   <Text className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                   </Text>
                </View>
             </View>
           )}

           {/* Seller */}
           <View className="mt-8">
              <Text className="text-lg font-bold text-[#111818] dark:text-white mb-3">Seller Info</Text>
              <View className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm flex-row items-center gap-4">
                 <View className="relative">
                    <Image source={{ uri: item.sellerAvatar }} className="size-16 rounded-2xl bg-gray-200" />
                    {item.seller?.isVerified && (
                      <View className="absolute -bottom-1 -right-1 size-5 bg-[#0066cc] rounded-full border-2 border-white items-center justify-center">
                         <MaterialIcons name="check" size={10} color="white" />
                      </View>
                    )}
                 </View>
                 <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                       <Text className="font-bold text-lg dark:text-white">{item.sellerName}</Text>
                    </View>
                    <Text className="text-xs text-slate-500 mt-1">Campus Member</Text>
                 </View>
                 <TouchableOpacity 
                    className="size-10 rounded-full bg-gray-50 dark:bg-slate-700 items-center justify-center"
                    onPress={handleMessageSeller}
                 >
                    <MaterialIcons name="chat-bubble-outline" size={20} color="#0066cc" />
                 </TouchableOpacity>
              </View>
           </View>

           {/* Trust Info */}
           <TouchableOpacity 
              onPress={() => setSafetyModalVisible(true)}
              className="mt-6 mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 flex-row gap-3 active:bg-blue-100"
           >
              <MaterialIcons name="security" size={24} color="#0066cc" />
              <View className="flex-1">
                 <Text className="font-bold text-sm text-blue-900 dark:text-blue-300">Secure University Exchange</Text>
                 <Text className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-0.5">Tap to read our safety guidelines for campus trades.</Text>
              </View>
           </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-white/95 dark:bg-[#1a1a1a]/95 border-t border-gray-100 dark:border-slate-800 flex-row gap-3 shadow-lg">
         <TouchableOpacity 
           onPress={handleToggleBookmark}
           disabled={toggleBookmarkMutation.isPending}
           className="size-14 rounded-2xl bg-gray-100 dark:bg-slate-800 items-center justify-center"
         >
            {toggleBookmarkMutation.isPending ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <MaterialIcons 
                name={isBookmarked ? "bookmark" : "bookmark-border"} 
                size={24} 
                color={isBookmarked ? "#0066cc" : "#64748B"} 
              />
            )}
         </TouchableOpacity>
         <TouchableOpacity 
           className="flex-1 bg-[#0066cc] rounded-2xl flex-row items-center justify-center gap-2 active:scale-95"
           onPress={handleMessageSeller}
         >
            <MaterialIcons name="chat-bubble-outline" size={24} color="white" />
            <Text className="text-white font-extrabold text-lg">Message Seller</Text>
         </TouchableOpacity>
      </View>

      {/* Safety Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={safetyModalVisible}
        onRequestClose={() => setSafetyModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-[#1e2124] rounded-t-3xl p-6 min-h-[50%]">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Safety First 🛡️</Text>
                <TouchableOpacity onPress={() => setSafetyModalVisible(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <MaterialIcons name="close" size={24} color="gray" />
                </TouchableOpacity>
            </View>
            
            <View className="gap-6">
                <View className="flex-row gap-4">
                    <View className="size-12 rounded-full bg-blue-100 items-center justify-center">
                        <MaterialIcons name="public" size={24} color="#0066cc" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">Meet in Public</Text>
                        <Text className="text-gray-500 leading-relaxed">Always meet in busy campus locations like the library, student center, or coffee shops. Avoid dorm rooms.</Text>
                    </View>
                </View>

                <View className="flex-row gap-4">
                    <View className="size-12 rounded-full bg-green-100 items-center justify-center">
                        <MaterialIcons name="payments" size={24} color="#16a34a" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">Cash or Campus Pay</Text>
                        <Text className="text-gray-500 leading-relaxed">Inspect the item thoroughly before paying. Avoid wire transfers or paying in advance.</Text>
                    </View>
                </View>

                <View className="flex-row gap-4">
                    <View className="size-12 rounded-full bg-orange-100 items-center justify-center">
                        <MaterialIcons name="report" size={24} color="#ea580c" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">Report Suspicious Activity</Text>
                        <Text className="text-gray-500 leading-relaxed">If a seller seems shady or asks for personal info, report them immediately via the user profile.</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity 
                onPress={() => setSafetyModalVisible(false)}
                className="mt-8 w-full bg-[#111818] dark:bg-white py-4 rounded-xl items-center"
            >
                <Text className="text-white dark:text-black font-bold text-lg">I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
