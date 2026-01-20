import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';

export default function SelectUniversityScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
          <View className="h-1.5 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          <View className="h-1.5 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
        </View>

        <TouchableOpacity onPress={() => router.push('/(onboarding)/identity')}>
          <Text className="text-sm font-bold text-primary">
            Skip
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView className="flex-1 px-6 pb-32">
        {/* Hero & Title */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-4 mb-10">
          <View className="w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center mb-6">
             <MaterialIcons name="school" size={32} color="#1990e6" />
          </View>
          <Text className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            Find Your Campus
          </Text>
          <Text className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Connect with your community, trade items, and discover events near you.
          </Text>
        </Animated.View>

        {/* Search */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="mb-10">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search university..."
            leftIcon="search"
            className="bg-slate-50 dark:bg-slate-900/50 border-0"
          />
        </Animated.View>

        {/* Suggested List */}
        <Animated.View entering={FadeInUp.delay(500).springify()} className="space-y-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Nearby Universities
            </Text>
            <MaterialIcons name="location-pin" size={16} color="#1990e6" />
          </View>

          {/* University Card 1 */}
          <TouchableOpacity 
            className="flex-row items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800"
            onPress={() => router.push('/(onboarding)/identity')}
          >
            <View className="w-14 h-14 rounded-xl bg-white p-2 items-center justify-center shadow-sm overflow-hidden">
              <Image 
                source={require('../../assets/images/moi-uni-logo.png')} 
                className="w-full h-full" 
                resizeMode="contain"
              />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-bold text-lg text-slate-900 dark:text-white mb-0.5">
                Moi University
              </Text>
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Eldoret, Kenya • 1.2 miles
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-300 dark:text-slate-600" />
          </TouchableOpacity>

          {/* University Card 2 */}
          <TouchableOpacity 
            className="flex-row items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800"
            onPress={() => router.push('/(onboarding)/identity')}
          >
            <View className="w-14 h-14 rounded-xl bg-white p-2 items-center justify-center shadow-sm overflow-hidden">
                <Image 
                source={require('../../assets/images/kenyatta-uni-logo.png')} 
                className="w-full h-full" 
                resizeMode="contain"
              />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-bold text-lg text-slate-900 dark:text-white mb-0.5">
                Kenyatta University
              </Text>
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Nairobi, Kenya • 5 miles
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} className="text-slate-300 dark:text-slate-600" />
          </TouchableOpacity>

          {/* Manual Entry */}
          <TouchableOpacity className="w-full flex-row items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 mt-2 active:bg-slate-50 dark:active:bg-slate-900/50">
            <MaterialIcons name="add" size={20} className="text-slate-400 mr-2" />
            <Text className="text-slate-400 font-bold">
              Can't find your university?
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="p-6">
        <Button
          title="Continue"
          rightIcon={<MaterialIcons name="arrow-forward" size={20} color="white" />}
          onPress={() => router.push('/(onboarding)/identity')}
          size="lg"
          className="shadow-xl shadow-primary/25"
        />
      </View>
    </SafeAreaView>
  );
}
