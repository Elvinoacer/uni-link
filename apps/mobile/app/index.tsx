import React, { useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // checkAuth is called in Providers.tsx - no need to call it here

  // Redirect to home if already authenticated
  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fafafc]">
        <Text className="text-[#1990e6] font-bold text-xl">Loading Campus...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0284c7]">
      <StatusBar style="light" />
      
      <SafeAreaView className="flex-1 justify-between px-6 py-10">
        <View className="items-center mt-20">
          <View className="w-20 h-20 bg-white rounded-3xl items-center justify-center mb-6 shadow-2xl">
            <Text className="text-4xl">🎓</Text>
          </View>
          <Text className="text-5xl font-black text-white text-center tracking-tighter">
            UniSocial
          </Text>
          <Text className="text-white/80 text-center mt-4 text-lg font-medium leading-relaxed px-4">
            Connect, trade, and discover everything happening on campus.
          </Text>
        </View>

        <View className="w-full space-y-4 mb-8">
          <Button 
            title="Join the Campus" 
            size="lg" 
            onPress={() => router.push('/(auth)/sign-up')}
            className="w-full bg-white mb-4"
            textClassName="text-[#0284c7]"
          />
          
          <TouchableOpacity 
            onPress={() => router.push('/(auth)/login')}
            className="py-4 items-center bg-white/10 rounded-2xl border border-white/20"
          >
            <Text className="text-white font-bold text-base">
              Already a member? <Text className="underline">Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
