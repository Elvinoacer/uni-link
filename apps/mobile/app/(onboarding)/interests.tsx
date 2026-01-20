import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0f172a]">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.delay(100).springify()}
        className="flex-row items-center justify-between px-6 pt-2 pb-6"
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
        >
          <MaterialIcons name="chevron-left" size={24} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
        
        {/* Progress Bar */}
        <View className="flex-row gap-2">
          <View className="h-1.5 w-8 rounded-full bg-primary" />
          <View className="h-1.5 w-8 rounded-full bg-primary" />
          <View className="h-1.5 w-8 rounded-full bg-primary" />
        </View>
        
        <View className="w-10" />
      </Animated.View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="items-center mb-10 mt-4">
          <Text className="text-4xl font-black text-center text-slate-900 dark:text-white mb-3 tracking-tight">
            Customize Feed
          </Text>
          <Text className="text-lg text-center text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
            Select the topics you want to see most on your campus.
          </Text>
        </Animated.View>

        {/* Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {INTERESTS.map((interest, index) => {
            const isSelected = selectedInterests.includes(interest.id);
            return (
              <View 
                key={interest.id}
                style={{
                  width: '48%',
                  height: 160,
                  borderRadius: 32, // rounded-[2rem]
                  borderWidth: 2,
                  overflow: 'hidden',
                  backgroundColor: isSelected ? 'rgba(25, 144, 230, 0.05)' : (isDark ? 'rgba(15, 23, 42, 0.4)' : '#F8FAFC'),
                  borderColor: isSelected ? '#1990e6' : (isDark ? '#1E293B' : '#F1F5F9'),
                  // Shadow manually
                  shadowColor: isSelected ? '#1990e6' : 'transparent',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isSelected ? 0.3 : 0,
                  shadowRadius: 10,
                  elevation: isSelected ? 10 : 0
                }}
              >
                <TouchableOpacity
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.8}
                  className="flex-1 items-center justify-center gap-4 p-4"
                >
                  <View className={`p-4 rounded-2xl ${isSelected ? 'bg-white/20' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
                    <MaterialIcons 
                      name={interest.icon} 
                      size={32} 
                      color={isSelected ? 'white' : '#1990e6'} 
                    />
                  </View>
                  <Text className={`font-bold text-[15px] text-center ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                    {interest.label}
                  </Text>
                </TouchableOpacity>

                {isSelected && (
                  <View className="absolute top-4 right-4 pointer-events-none">
                     <Animated.View entering={FadeInUp}>
                        <MaterialIcons name="check-circle" size={20} color="white" />
                     </Animated.View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0">
        <LinearGradient
          colors={isDark ? ['transparent', '#0f172a', '#0f172a'] : ['transparent', '#ffffff', '#ffffff']}
          className="p-6 pt-20"
        >
          <Button
            title="Finish Setup"
            onPress={() => router.replace('/(tabs)/home')}
            size="lg"
            className="rounded-2xl shadow-xl shadow-primary/25"
            rightIcon={<MaterialIcons name="check" size={24} color="white" />}
          />
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
