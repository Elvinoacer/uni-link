import React from 'react';
import { View, Text, useColorScheme as useRNColorScheme } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { colorScheme } = useColorScheme();
  
  // Fallback if nativewind hook is not fully ready or context missing, though it should be fine.
  // Using explicit colors for gradients since LinearGradient doesn't support className based colors nicely without variables.
  const isDark = colorScheme === 'dark';

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#0f172a]">
        <Text className="text-primary font-bold text-xl">Loading Kampus...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#0284c7', '#0f172a'] : ['#ffffff', '#e0f2fe', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        className="absolute inset-0"
      />

      {/* Decorative Blur Blobs (Simulated with opacity/gradients if needed, but sticking to clean gradient for perfs/compat) */}
      
      <SafeAreaView className="flex-1 justify-between px-6 py-4">
        
        {/* Hero Section */}
        <View className="flex-1 items-center justify-center -mt-20">
          <Animated.View 
            entering={FadeInDown.delay(200).springify()} 
            className="w-24 h-24 bg-primary rounded-3xl items-center justify-center mb-8 shadow-xl shadow-primary/30"
          >
            <Ionicons name="school" size={48} color="white" />
          </Animated.View>
          
          <Animated.Text 
            entering={FadeInDown.delay(300).springify()}
            className="text-5xl font-black text-slate-900 dark:text-white text-center tracking-tighter mb-4"
          >
            Kampus
          </Animated.Text>
          
          <Animated.Text 
            entering={FadeInDown.delay(400).springify()}
            className="text-slate-600 dark:text-slate-300 text-center text-lg font-medium leading-relaxed max-w-[80%]"
          >
            Connect, trade, and discover everything happening on campus.
          </Animated.Text>
        </View>

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          className="w-full space-y-4 mb-8"
        >
          <Button 
            title="Join the Campus" 
            size="lg" 
            onPress={() => router.push('/(auth)/sign-up')}
            className="w-full shadow-lg shadow-primary/25 rounded-2xl"
          />
          
          <Button 
            title="Login" 
            variant="outline"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
            className="w-full border-2 rounded-2xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            textClassName="text-slate-700 dark:text-white"
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
