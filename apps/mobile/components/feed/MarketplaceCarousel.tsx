import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useListings } from '../../hooks/useMarketplace';

// Helper to get first image from various image formats
function getItemImage(item: any): string | null {
  // If item.image exists, use it
  if (item.image && typeof item.image === 'string') {
    return item.image;
  }
  // If item.images is a JSON string, parse it
  if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  }
  // If item.images is an array
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images[0];
  }
  return null;
}

export function MarketplaceCarousel() {
  const router = useRouter();
  const { data, isLoading } = useListings();

  const carouselItems = data?.pages[0]?.slice(0, 8) || [];

  if (isLoading) return (
      <View className="px-4 py-2">
           <View className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </View>
  );

  if (carouselItems.length === 0) return null;

  return (
    <View className="py-3">
      <View className="pl-5 pr-5 flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="bg-gradient-to-r from-[#1990e6] to-[#10b981] px-2 py-0.5 rounded-md">
                <Text className="text-[9px] font-bold text-white uppercase tracking-wider">NEW</Text>
            </View>
            <Text className="font-bold text-base dark:text-white tracking-tight">Marketplace Finds</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/marketplace')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-sm font-semibold text-[#1990e6]">See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="overflow-visible"
            contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {carouselItems.map((item) => {
            const imageUrl = getItemImage(item);
            return (
              <TouchableOpacity 
                  key={item.id} 
                  activeOpacity={0.9}
                  onPress={() => router.push(`/marketplace/${item.id}` as any)}
                  className="w-[120px] bg-white dark:bg-[#1e2124] rounded-xl mr-2.5 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm"
              >
                <View className="h-[90px] bg-gray-100 dark:bg-gray-800 relative">
                    {imageUrl ? (
                      <Image 
                        source={imageUrl}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Text className="text-gray-400 text-xs">No image</Text>
                      </View>
                    )}
                    <View className="absolute bottom-1.5 left-1.5 bg-black/70 px-1.5 py-0.5 rounded">
                        <Text className="text-white text-[10px] font-bold">Kes {item.price}</Text>
                    </View>
                </View>
                <View className="p-2">
                    <Text numberOfLines={1} className="text-[12px] font-semibold text-[#111818] dark:text-white">
                      {item.title}
                    </Text>
                     <Text numberOfLines={1} className="text-[10px] text-gray-500 font-medium mt-0.5">
                      {item.condition}
                    </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
    </View>
  );
}

