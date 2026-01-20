import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';

export interface MarketItem {
  id: string;
  title: string;
  description?: string;
  price: number | string;
  image?: string;
  images?: string | string[]; // Can be JSON string or array
  condition: string;
  location?: string;
  category?: string;
  status?: string;
  sellerId?: string;
  isFavorited?: boolean;
  isBookmarked?: boolean;
  seller?: {
    id?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    isVerified?: boolean;
    // Legacy fields for compatibility
    name?: string;
    avatar?: string;
    rating?: number;
    joinedAt?: string;
  };
  metrics?: {
    likes: number;
    views?: number;
  };
}

interface MarketItemCardProps {
  item: MarketItem;
  onPress: () => void;
  onToggleFavorite?: (id: string) => void;
  onMessage?: (item: MarketItem) => void;
}

export function MarketItemCard({ item, onPress, onToggleFavorite, onMessage }: MarketItemCardProps) {
  // Determine image source
  let imageUrl = item.image;
  if (!imageUrl && item.images) {
      if (Array.isArray(item.images) && item.images.length > 0) {
          imageUrl = item.images[0];
      } else if (typeof item.images === 'string') {
          try {
              const parsed = JSON.parse(item.images);
              if (Array.isArray(parsed) && parsed.length > 0) {
                  imageUrl = parsed[0];
              }
          } catch (e) {
              // If not JSON, maybe it's just a URL string?
              if (item.images.startsWith('http')) {
                  imageUrl = item.images;
              }
          }
      }
  }

  // Fallback if still no image
  if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'; // Fallback placeholder
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      className="flex-1 bg-white dark:bg-[#1e2124] rounded-2xl overflow-hidden shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 mb-6"
    >
      <View className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-700">
        <Image 
          source={{ uri: imageUrl }} 
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Condition Badge */}
        <View className={clsx(
          "absolute top-2 left-2 px-2 py-1 rounded-md backdrop-blur-md shadow-sm",
          item.condition === 'New' ? "bg-green-500/90" : "bg-black/60"
        )}>
          <Text className="text-[10px] font-black uppercase text-white tracking-wider">
            {item.condition}
          </Text>
        </View>

        {/* Like Button */}
        {onToggleFavorite && (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-black/40 backdrop-blur-md items-center justify-center shadow-sm"
            >
              <MaterialIcons 
                name={item.isFavorited ? "favorite" : "favorite-border"} 
                size={18} 
                color={item.isFavorited ? "#EF4444" : "#111818"} 
                style={{ opacity: item.isFavorited ? 1 : 0.7 }}
              />
            </TouchableOpacity>
        )}
      </View>

      <View className="p-3 pt-2 flex-1 justify-between">
        <View>
            <View className="flex-row items-center justify-between mb-0.5">
                <Text className="text-[17px] font-black text-[#111818] dark:text-gray-100 tracking-tight">{item.price}</Text>
                {item.location && (
                    <Text className="text-[10px] uppercase font-bold text-gray-400">{item.location}</Text>
                )}
            </View>
            <Text numberOfLines={2} className="font-medium text-[13px] leading-tight mb-2 text-gray-700 dark:text-gray-300">
            {item.title}
            </Text>
        </View>
        
        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
           <View className="flex-row items-center gap-1.5 flex-1 mr-2">
              <Image 
                source={{ uri: item.seller?.avatar || item.seller?.avatarUrl || 'https://ui-avatars.com/api/?name=U&background=random' }} 
                className="w-5 h-5 rounded-full bg-gray-200"
              />
              <Text numberOfLines={1} className="text-[11px] font-semibold text-gray-500 flex-1">{item.seller?.name || item.seller?.displayName || 'Seller'}</Text>
           </View>
           {onMessage && (
               <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={(e) => {
                        e.stopPropagation();
                        onMessage(item);
                    }}
                    className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full"
                >
                   <MaterialIcons name="chat-bubble-outline" size={14} color="#64748B" />
               </TouchableOpacity>
           )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
