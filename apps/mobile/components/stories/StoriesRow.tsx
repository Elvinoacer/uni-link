import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStoriesFeed, useMyStories } from '../../hooks/useStories';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export function StoriesRow({ router }: { router: any }) {
  const { user } = useAuthStore();
  const { data: storiesFeed, isLoading } = useStoriesFeed();
  const { data: myStories } = useMyStories();

  const hasMyStory = myStories && myStories.length > 0;
  
  // Calculate total likes on my stories
  const totalLikes = myStories?.reduce((sum, s) => sum + (s.likeCount || 0), 0) || 0;

  // Filter out current user from feed (they're shown separately as "Your Story")
  const otherStories = storiesFeed?.filter(group => group.user.id !== user?.id) || [];

  const getInitials = (name: string | null | undefined, username: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return (username || 'User').slice(0, 2).toUpperCase();
  };

  const renderAvatarContent = (u: any, sizeClass = "w-[90%] h-[90%]") => {
      if (u?.avatarUrl) {
          return (
              <Image 
                  source={{ uri: u.avatarUrl }} 
                  className={`${sizeClass} rounded-full border-[3px] border-white dark:border-[#0f1419]`}
              />
          );
      }
      return (
          <View className={`${sizeClass} rounded-full border-[3px] border-white dark:border-[#0f1419] bg-gradient-to-br from-violet-500 to-fuchsia-500 items-center justify-center`}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: '100%', height: '100%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text className="text-white font-bold text-sm">
                    {getInitials(u?.displayName, u?.username)}
                </Text>
              </LinearGradient>
          </View>
      );
  };

  if (isLoading) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(400)}
      className="py-4 bg-white dark:bg-[#0f1419]"
    >
      {/* Section Header */}
      <View className="flex-row items-center justify-between px-5 mb-3">
        <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Stories
        </Text>
        <TouchableOpacity className="flex-row items-center gap-1">
          <Text className="text-xs font-bold text-indigo-500">View All</Text>
          <MaterialIcons name="chevron-right" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {/* My Story - Always First */}
        <Animated.View entering={FadeInRight.delay(0).duration(300)}>
          <TouchableOpacity 
            onPress={() => {
                if (hasMyStory) {
                    router.push(`/stories/view/${user?.id}`);
                } else {
                    router.push('/stories/create');
                }
            }}
            className="items-center"
            activeOpacity={0.8}
          >
            <View className="w-[72px] h-[72px] relative">
              {hasMyStory ? (
                <LinearGradient
                  colors={['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6']}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full h-full rounded-full p-[2.5px]"
                >
                  <View className="w-full h-full rounded-full bg-white dark:bg-[#0f1419] items-center justify-center p-[2px]">
                    {renderAvatarContent(user, "w-full h-full")}
                  </View>
                </LinearGradient>
              ) : (
                <View className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
                  {renderAvatarContent(user, "w-full h-full")}
                </View>
              )}
              
              {/* Add button */}
              {!hasMyStory && (
                <View className="absolute -bottom-0.5 -right-0.5">
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    className="w-6 h-6 rounded-full items-center justify-center border-[3px] border-white dark:border-[#0f1419]"
                  >
                    <MaterialIcons name="add" size={14} color="white" />
                  </LinearGradient>
                </View>
              )}
              
              {/* Like count badge */}
              {hasMyStory && totalLikes > 0 && (
                <View className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 min-w-[20px] h-[20px] rounded-full items-center justify-center border-2 border-white dark:border-[#0f1419] shadow-lg">
                  <Text className="text-white text-[10px] font-bold px-1">{totalLikes}</Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] mt-2 text-gray-700 dark:text-gray-300 font-semibold">Your Story</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Other Stories */}
        {otherStories.map((group, index) => (
          <Animated.View 
            key={group.user.id}
            entering={FadeInRight.delay((index + 1) * 50).duration(300)}
          >
            <TouchableOpacity 
              onPress={() => router.push(`/stories/view/${group.user.id}`)}
              className="items-center"
              activeOpacity={0.8}
            >
              <View className="w-[72px] h-[72px]">
                {group.allViewed ? (
                  <View className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 p-[2.5px]">
                    <View className="w-full h-full rounded-full bg-white dark:bg-[#0f1419] items-center justify-center p-[2px]">
                      {renderAvatarContent(group.user, "w-full h-full")}
                    </View>
                  </View>
                ) : (
                  <LinearGradient
                    colors={['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    className="w-full h-full rounded-full p-[2.5px]"
                  >
                    <View className="w-full h-full rounded-full bg-white dark:bg-[#0f1419] items-center justify-center p-[2px]">
                      {renderAvatarContent(group.user, "w-full h-full")}
                    </View>
                  </LinearGradient>
                )}
              </View>
              <Text 
                className="text-[11px] mt-2 text-gray-700 dark:text-gray-300 font-medium w-[70px] text-center" 
                numberOfLines={1}
              >
                {group.user.displayName || group.user.username}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
