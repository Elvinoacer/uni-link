import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/authStore';

export default function AccountLinkedScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleGoToProfile = () => {
    router.replace('/(tabs)/profile');
  };

  const handleGoToMarketplace = () => {
    router.replace('/(tabs)/marketplace');
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-[#e0f7ff] to-white dark:from-[#1a3a52] dark:to-[#121212]">
      {/* Close Button */}
      <View className="flex-row justify-between px-4 py-3">
        <View className="size-10" />
        <Text className="text-base font-bold dark:text-white">Verification</Text>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          className="size-10 items-center justify-center"
        >
          <MaterialIcons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 items-center justify-center">
        {/* Celebration Icon */}
        <View className="size-32 rounded-full bg-[#38bdf8]/20 items-center justify-center mb-6 relative">
          <View className="size-24 rounded-full bg-[#38bdf8]/30 items-center justify-center">
            <MaterialIcons name="celebration" size={48} color="#1990e6" />
          </View>
          {/* Sparkles */}
          <View className="absolute -top-2 -right-2">
            <Text className="text-2xl">✨</Text>
          </View>
          <View className="absolute -bottom-1 -left-3">
            <Text className="text-xl">⭐</Text>
          </View>
          <View className="absolute top-4 left-0">
            <Text className="text-lg">🎉</Text>
          </View>
        </View>

        {/* Title */}
        <Text className="text-3xl font-black text-center text-[#1a3a52] dark:text-white mb-2">
          Account Linked!
        </Text>
        <Text className="text-center text-gray-500 mb-10 px-4">
          Welcome to the inner circle of your campus community.
        </Text>

        {/* User Card */}
        <View className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full items-center shadow-lg border border-gray-100 dark:border-gray-800 mb-8">
          <View className="size-20 rounded-full bg-[#1990e6]/10 items-center justify-center mb-4 relative">
            <Image 
              source={{ uri: user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id}` }}
              className="size-20 rounded-full"
            />
            <View className="absolute -bottom-1 -right-1 size-6 rounded-full bg-[#22c55e] items-center justify-center border-2 border-white">
              <MaterialIcons name="check" size={14} color="white" />
            </View>
          </View>
          <Text className="text-xl font-bold text-[#1a3a52] dark:text-white">
            {user?.displayName || user?.username || 'Alex Johnson'}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <MaterialIcons name="verified" size={16} color="#22c55e" />
            <Text className="text-[#22c55e] font-bold text-sm">VERIFIED STUDENT</Text>
          </View>
        </View>

        {/* Privacy Notice */}
        <View className="flex-row items-start gap-2 px-4 mb-8">
          <MaterialIcons name="lock" size={16} color="#94A3B8" />
          <Text className="flex-1 text-xs text-gray-400 leading-relaxed">
            Your university email is used strictly for trust and safety purposes. It will{' '}
            <Text className="font-bold">never</Text> be visible to other students or shared with third parties.
          </Text>
        </View>
      </View>

      {/* Bottom CTAs */}
      <View className="p-6 gap-3">
        <Button
          title="Go to Profile"
          onPress={handleGoToProfile}
          size="lg"
        />
        <TouchableOpacity 
          onPress={handleGoToMarketplace}
          className="py-4 items-center rounded-xl border-2 border-gray-200 dark:border-gray-700"
        >
          <Text className="font-bold text-[#1a3a52] dark:text-white">Check out Marketplace</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
