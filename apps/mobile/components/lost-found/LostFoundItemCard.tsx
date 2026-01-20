import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { useRouter } from 'expo-router';

export interface LostFoundItem {
  id: string;
  title: string;
  type: 'lost' | 'found';
  location: string;
  timeAgo: string;
  image: string;
  isNew?: boolean;
}

interface LostFoundItemCardProps {
  item: LostFoundItem;
}

export function LostFoundItemCard({ item }: LostFoundItemCardProps) {
  const router = useRouter();

  return (
    <View className="bg-white dark:bg-[#1e2124] rounded-xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5 flex-col mb-4 break-inside-avoid">
      <View className="aspect-square bg-gray-200 relative">
        <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
        {item.isNew && (
          <View className="absolute top-2 left-2 bg-[#FAD254] px-2 py-1 rounded-full shadow-sm">
            <Text className="text-black text-[10px] font-bold uppercase tracking-wider">New</Text>
          </View>
        )}
      </View>
      
      <View className="p-3">
        <Text numberOfLines={1} className="font-bold text-sm leading-tight dark:text-white">{item.title}</Text>
        
        <View className="flex-row items-center gap-1 mt-1">
          <MaterialIcons name="location-on" size={14} color="#64748B" />
          <Text numberOfLines={1} className="text-[11px] text-slate-500 flex-1">{item.location}</Text>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-[10px] text-slate-500">{item.timeAgo}</Text>
          <TouchableOpacity 
            onPress={() => router.push(`/lost-found/claim/${item.id}` as any)}
            className="bg-[#087d7d] px-3 py-1.5 rounded-lg active:scale-95"
          >
            <Text className="text-white text-[11px] font-bold">Claim</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
