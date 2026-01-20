import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function SelectUniversityScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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
          <View className="h-1 w-12 rounded-full bg-primary" />
          <View className="h-1 w-6 rounded-full bg-gray-300 dark:bg-gray-700" />
          <View className="h-1 w-6 rounded-full bg-gray-300 dark:bg-gray-700" />
        </View>

        <TouchableOpacity onPress={() => router.push('/(onboarding)/identity')}>
          <Text className="text-sm font-medium text-accent hover:opacity-80">
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pb-32">
        {/* Hero Image Area */}
        <View className="mt-4 mb-8">
          <View className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-primary/5 relative items-center justify-center">
             <MaterialIcons name="school" size={64} color="#1990e6" style={{ opacity: 0.5 }} />
             <View className="absolute inset-0 bg-primary/10" />
          </View>
        </View>

        {/* Welcome Text */}
        <View className="mb-8 items-center">
          <Text className="text-3xl font-bold text-center mb-3 text-text-light dark:text-text-dark">
            Find Your Campus
          </Text>
          <Text className="text-base text-center opacity-70 leading-relaxed px-4 text-text-light dark:text-text-dark">
            Connect with your community, trade items, and discover events near you.
          </Text>
        </View>

        {/* Search */}
        <View className="mb-8">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Enter your university name..."
            leftIcon="search"
            rightIcon="map"
            className="shadow-sm"
          />
        </View>

        {/* Suggested List */}
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-sm font-bold opacity-60 uppercase tracking-wider text-text-light dark:text-text-dark">
              Nearby Universities
            </Text>
            <MaterialIcons name="location-pin" size={16} color="#1990e6" />
          </View>

          <View className="space-y-3 gap-3">
            {/* University Card 1 */}
            <TouchableOpacity 
              className="flex-row items-center p-4 rounded-xl bg-card-light dark:bg-card-dark border-2 border-transparent active:border-primary/30"
              onPress={() => router.push('/(onboarding)/identity')} // Go to Choose Identity
            >
              <View className="w-12 h-12 rounded-lg bg-white items-center justify-center shadow-sm border border-gray-100">
                <MaterialIcons name="account-balance" size={24} color="#000" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-base text-text-light dark:text-text-dark">
                  Stanford University
                </Text>
                <Text className="text-xs opacity-50 font-medium text-text-light dark:text-text-dark">
                  Stanford, CA • 2.4 miles
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#D1D5DB" />
            </TouchableOpacity>

            {/* University Card 2 */}
            <TouchableOpacity 
              className="flex-row items-center p-4 rounded-xl bg-card-light dark:bg-card-dark border-2 border-transparent active:border-primary/30"
              onPress={() => router.push('/(onboarding)/identity')}
            >
              <View className="w-12 h-12 rounded-lg bg-white items-center justify-center shadow-sm border border-gray-100">
                 <MaterialIcons name="account-balance" size={24} color="#000" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-base text-text-light dark:text-text-dark">
                  UC Berkeley
                </Text>
                <Text className="text-xs opacity-50 font-medium text-text-light dark:text-text-dark">
                  Berkeley, CA • 35 miles
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Manual Entry */}
            <TouchableOpacity className="w-full flex-row items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 mt-2">
              <MaterialIcons name="add-circle-outline" size={24} color="#9CA3AF" />
              <Text className="ml-2 text-gray-400 font-medium">
                Suggest your university
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="p-6 bg-background-light dark:bg-background-dark border-t border-gray-100 dark:border-gray-800">
        <Button
          title="Get Started"
          rightIcon={<MaterialIcons name="arrow-forward" size={20} color="white" />}
          onPress={() => router.push('/(onboarding)/identity')}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
