import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface FeedHeaderProps {
  activeTab: 'global' | 'following';
  onTabChange: (tab: 'global' | 'following') => void;
}

import { useUnreadNotificationsCount } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/authStore';
import { getUserAvatar } from '../../utils/images';

export function FeedHeader({ activeTab, onTabChange }: FeedHeaderProps) {
  const router = useRouter();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const { user } = useAuthStore();

  const userAvatar = getUserAvatar(user?.avatarUrl, user?.displayName || user?.username || 'User');

  return (
    <View className="bg-white/80 dark:bg-[#0f1419]/90 backdrop-blur-xl border-b border-gray-100/50 dark:border-white/5">
      {/* Main Header Row */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        {/* Profile Avatar with Ring */}
        <Pressable 
          onPress={() => router.push('/(tabs)/profile')}
          className="relative"
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-10 h-10 rounded-full p-[2px]"
          >
            <Image 
              source={{ uri: userAvatar }} 
              className="w-full h-full rounded-full border-2 border-white dark:border-[#0f1419]"
            />
          </LinearGradient>
          {/* Online indicator */}
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0f1419]" />
        </Pressable>

        {/* Logo/Title - Premium Typography */}
        <View className="items-center">
          <Text className="text-[22px] font-black tracking-tight text-gray-900 dark:text-white">
            Kampus
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Text className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400">
              Campus Feed
            </Text>
          </View>
        </View>

        {/* Action Icons - Glass Style */}
        <View className="flex-row items-center gap-2">
          <Pressable 
            onPress={() => router.push('/messages')}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100/80 dark:bg-white/10"
          >
            <MaterialIcons name="chat-bubble-outline" size={20} color={activeTab === 'global' ? '#374151' : '#6B7280'} />
          </Pressable>
          <Pressable 
            onPress={() => router.push('/notifications')}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100/80 dark:bg-white/10 relative"
          >
             <MaterialIcons name="notifications-none" size={22} color={activeTab === 'global' ? '#374151' : '#6B7280'} />
             {(unreadCount || 0) > 0 && (
                 <View className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-pink-500 rounded-full items-center justify-center px-1 border-2 border-white dark:border-[#0f1419]">
                   <Text className="text-[10px] text-white font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                 </View>
             )}
          </Pressable>
        </View>
      </View>

      {/* Tabs - Modern Pill Style */}
      <View className="flex-row px-5 pb-3 gap-2">
        <Pressable 
            onPress={() => onTabChange('global')}
            className={`flex-1 py-2.5 rounded-full items-center ${activeTab === 'global' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-white/5'}`}
        >
          <Text className={`text-[13px] font-bold ${activeTab === 'global' ? 'text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400'}`}>
            For You
          </Text>
        </Pressable>
        <Pressable 
            onPress={() => onTabChange('following')}
            className={`flex-1 py-2.5 rounded-full items-center ${activeTab === 'following' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-white/5'}`}
        >
          <Text className={`text-[13px] font-bold ${activeTab === 'following' ? 'text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400'}`}>
            Following
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
