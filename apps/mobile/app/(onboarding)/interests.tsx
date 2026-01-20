import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';

const INTERESTS = [
  { id: 'news', label: 'Campus News', icon: 'article' as const },
  { id: 'marketplace', label: 'Marketplace', icon: 'shopping-bag' as const },
  { id: 'parties', label: 'Parties', icon: 'auto-awesome' as const },
  { id: 'study', label: 'Study Groups', icon: 'menu-book' as const },
  { id: 'sports', label: 'Sports', icon: 'sports-basketball' as const },
  { id: 'lostfound', label: 'Lost & Found', icon: 'search' as const },
];

export default function InterestsScreen() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['news', 'study']);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-6 pb-2">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-card-light dark:bg-card-dark"
        >
          <MaterialIcons name="chevron-left" size={24} color="#1990e6" />
        </TouchableOpacity>
        
        {/* Progress Bar */}
        <View className="flex-row gap-2">
          <View className="h-1 w-6 rounded-full bg-gray-300 dark:bg-gray-700" />
          <View className="h-1 w-6 rounded-full bg-gray-300 dark:bg-gray-700" />
          <View className="h-1 w-12 rounded-full bg-primary" />
        </View>
        
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 pb-32">
        {/* Headline */}
        <View className="items-center mb-10 mt-8">
          <Text className="text-4xl font-extrabold text-center text-text-light dark:text-text-dark mb-3">
            Customize your feed
          </Text>
          <Text className="text-lg text-center text-gray-500 max-w-[280px]">
            Select the topics you want to see most on your campus.
          </Text>
        </View>

        {/* Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                onPress={() => toggleInterest(interest.id)}
                activeOpacity={0.9}
                className="w-[48%]"
              >
                <View 
                  className={`flex items-center justify-center gap-3 p-5 rounded-[2.5rem] border-2 transition-all ${
                    isSelected 
                      ? 'bg-primary border-transparent shadow-lg shadow-primary/20 scale-[1.02]' 
                      : 'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-700 shadow-sm'
                  }`}
                >
                  <View className={`p-3 rounded-full ${isSelected ? 'bg-white/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                    <MaterialIcons 
                      name={interest.icon} 
                      size={32} 
                      color={isSelected ? 'white' : '#52525B'} 
                    />
                  </View>
                  <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                    {interest.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="p-6 bg-transparent absolute bottom-0 left-0 right-0">
        <View className="bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent pt-12 pb-6 -mb-6">
          <Button
            title="Finish"
            onPress={() => router.replace('/(tabs)/home')}
            size="lg"
            className="rounded-full shadow-xl shadow-primary/20"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
