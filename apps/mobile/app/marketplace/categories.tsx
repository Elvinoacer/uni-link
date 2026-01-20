import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCategories } from '../../hooks/useMarketplace';

export default function CategoriesScreen() {
  const router = useRouter();
  const { data: categories } = useCategories();

  return (
    <View className="flex-1 bg-white dark:bg-[#171f26]">
      <Stack.Screen options={{ title: 'All Categories', headerBackTitle: 'Market' }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-gray-500 dark:text-gray-400 mb-4">Browse by category</Text>
        
        <View className="flex-row flex-wrap gap-4">
             {/* All Option */}
             <TouchableOpacity 
                onPress={() => router.navigate('/(tabs)/marketplace')} // Navigate back with no params = All
                className="w-[47%] bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl items-center gap-3 active:bg-gray-100"
            >
                <View className="size-12 rounded-full bg-[#1990e6]/10 items-center justify-center">
                    <MaterialIcons name="apps" size={24} color="#1990e6" />
                </View>
                <Text className="font-bold text-[#111818] dark:text-white">All Items</Text>
            </TouchableOpacity>

            {(categories || []).map(cat => (
                <TouchableOpacity 
                    key={cat.id}
                    onPress={() => router.navigate({ pathname: '/(tabs)/marketplace', params: { category: cat.name } })}
                    className="w-[47%] bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl items-center gap-3 active:bg-gray-100"
                >
                    <View className="size-12 rounded-full bg-white dark:bg-gray-700 items-center justify-center shadow-sm">
                        <MaterialIcons name={cat.icon as any} size={24} color="#64748B" />
                    </View>
                    <Text className="font-bold text-[#111818] dark:text-white text-center">{cat.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
