import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import clsx from 'clsx';
import { LostFoundItem, LostFoundItemCard } from '../../components/lost-found/LostFoundItemCard';

const MOCK_ITEMS: LostFoundItem[] = [
  { id: '1', title: 'iPhone 13 - Blue', type: 'found', location: 'Student Union', timeAgo: '2h ago', image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&fit=crop', isNew: true },
  { id: '2', title: 'House Keys', type: 'found', location: 'Main Library', timeAgo: '5h ago', image: 'https://images.unsplash.com/photo-1582140460980-60b6fd501438?w=800&fit=crop' },
  { id: '3', title: 'HydroFlask 32oz', type: 'found', location: 'Gym Complex', timeAgo: 'Yesterday', image: 'https://images.unsplash.com/photo-1602143407151-11115cdbf6e0?w=800&fit=crop' },
  { id: '4', title: 'MacBook Charger', type: 'found', location: 'Engineering Lab', timeAgo: '2 days ago', image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&fit=crop' },
];

export default function LostFoundScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('found');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]">
       {/* Header */}
       <View className="px-4 py-3 bg-white/80 dark:bg-[#171f26]/80 backdrop-blur-md sticky top-0 z-50">
          <View className="flex-row items-center justify-between gap-4">
             <TouchableOpacity onPress={() => router.back()} className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
                <MaterialIcons name="arrow-back" size={24} color="#111818" />
             </TouchableOpacity>
             <Text className="text-xl font-bold tracking-tight dark:text-white">Lost & Found</Text>
             <TouchableOpacity className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
                <MaterialIcons name="tune" size={24} color="#111818" />
             </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="mt-4 flex-row items-center bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm border border-black/5 dark:border-white/5">
             <MaterialIcons name="search" size={24} color="#608a8a" />
             <TextInput 
                placeholder="Search for keys, wallets, etc..."
                placeholderTextColor="#608a8a"
                className="flex-1 ml-2 text-sm dark:text-white"
             />
          </View>

          {/* Tabs */}
          <View className="mt-4 flex-row bg-black/5 dark:bg-white/10 p-1 rounded-xl">
             <TouchableOpacity 
               onPress={() => setActiveTab('lost')}
               className={clsx(
                 "flex-1 h-10 items-center justify-center rounded-lg transition-all",
                 activeTab === 'lost' ? "bg-[#087d7d]" : "bg-transparent"
               )}
             >
                <Text className={clsx("text-sm font-semibold", activeTab === 'lost' ? "text-white" : "text-[#608a8a]")}>Lost</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={() => setActiveTab('found')}
               className={clsx(
                 "flex-1 h-10 items-center justify-center rounded-lg transition-all",
                 activeTab === 'found' ? "bg-[#087d7d]" : "bg-transparent"
               )}
             >
                <Text className={clsx("text-sm font-semibold", activeTab === 'found' ? "text-white" : "text-[#608a8a]")}>Found</Text>
             </TouchableOpacity>
          </View>
       </View>

       <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <View className="flex-row flex-wrap justify-between">
             {MOCK_ITEMS.map(item => (
                <View key={item.id} style={{ width: '48%' }}>
                   <LostFoundItemCard item={item} />
                </View>
             ))}
          </View>
       </ScrollView>

       {/* FAB */}
       <TouchableOpacity className="absolute bottom-8 right-8 size-14 bg-[#087d7d] rounded-full shadow-lg items-center justify-center active:scale-95">
          <MaterialIcons name="add" size={32} color="white" />
       </TouchableOpacity>
    </SafeAreaView>
  );
}
