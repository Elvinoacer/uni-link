import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import clsx from 'clsx';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCommunities, useMyCommunities, useFollowingCommunities, useFollowCommunity } from '../../../hooks/useCommunities';
import { useUnreadNotificationsCount } from '../../../hooks/useNotifications';
import { Community } from '../../../services/community.service';
import { useTabBarAnimation } from '../../../context/TabBarContext';

// Platform icons mapping
const PLATFORM_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  whatsapp: 'chat',
  twitter: 'tag',
  facebook: 'facebook',
  instagram: 'photo-camera',
  telegram: 'send',
  discord: 'headset',
  other: 'link',
};

// Community Card Component
function CommunityCard({ 
  community, 
  onPress, 
  onFollow,
  isFollowing: _isFollowing,
}: { 
  community: Community; 
  onPress: () => void;
  onFollow?: (action: 'follow' | 'unfollow') => void;
  isFollowing?: boolean;
}) {
  const isFollowing = _isFollowing ?? community.isFollowing;
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white dark:bg-slate-800 rounded-2xl mr-3 overflow-hidden shadow-sm border border-black/5 dark:border-white/5"
      style={{ width: 200 }}
      activeOpacity={0.9}
    >
      {/* Banner */}
      <View className="h-16 bg-gradient-to-r from-purple-500 to-indigo-500">
        {community.bannerUrl && (
          <Image source={{ uri: community.bannerUrl }} className="w-full h-full" resizeMode="cover" />
        )}
      </View>
      
      {/* Avatar */}
      <View className="absolute top-10 left-3">
        <View className="size-12 rounded-xl bg-white dark:bg-slate-700 items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden">
          {community.avatarUrl ? (
            <Image source={{ uri: community.avatarUrl }} className="size-12" />
          ) : (
            <MaterialIcons name="groups" size={24} color="#9333ea" />
          )}
        </View>
      </View>
      
      {/* Content */}
      <View className="pt-8 pb-3 px-3">
        <View className="flex-row items-center gap-1">
          <Text className="font-bold text-sm dark:text-white" numberOfLines={1}>{community.name}</Text>
          {community.isVerified && (
            <MaterialIcons name="verified" size={14} color="#3b82f6" />
          )}
        </View>
        <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={2}>
          {community.description || 'No description'}
        </Text>
        
        {/* Stats */}
        <View className="flex-row items-center gap-3 mt-2">
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="people" size={12} color="#9ca3af" />
            <Text className="text-[10px] text-gray-400">{community.followersCount || 0}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="article" size={12} color="#9ca3af" />
            <Text className="text-[10px] text-gray-400">{community.postsCount || 0}</Text>
          </View>
        </View>

        {/* Follow Button */}
        {onFollow && !community.isOwner && (
          <TouchableOpacity
            onPress={() => onFollow(isFollowing ? 'unfollow' : 'follow')}
            className={clsx(
              "mt-2 py-1.5 rounded-lg items-center",
              isFollowing ? "bg-gray-100 dark:bg-slate-700" : "bg-purple-600"
            )}
          >
            <Text className={clsx("text-xs font-bold", isFollowing ? "text-gray-600 dark:text-gray-300" : "text-white")}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Section Header Component
function SectionHeader({ title, count, badge }: { title: string; count?: number; badge?: string }) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-3">
      <Text className="text-lg font-bold tracking-tight dark:text-white">{title}</Text>
      {count !== undefined && count > 0 && (
        <View className="bg-purple-500/10 px-2 py-0.5 rounded-md">
          <Text className="text-purple-600 text-[10px] font-black uppercase tracking-widest">
            {badge || `${count} communities`}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CommunitiesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  // Queries
  const { data: allCommunities, isLoading: isLoadingAll, refetch: refetchAll } = useCommunities();
  const { data: myCommunities, isLoading: isLoadingMy, refetch: refetchMy } = useMyCommunities();
  const { data: followingCommunities, isLoading: isLoadingFollowing, refetch: refetchFollowing } = useFollowingCommunities();
  const { data: unreadCount } = useUnreadNotificationsCount();
  
  // Mutation
  const { mutate: followMutate } = useFollowCommunity();

  // Tab Bar Animation
  const { tabBarTranslateY } = useTabBarAnimation();
  const lastContentOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentOffset = event.contentOffset.y;
      const diff = currentOffset - lastContentOffset.value;

      // Ignore bounces
      if (currentOffset <= 0 || currentOffset > event.contentSize.height - event.layoutMeasurement.height) {
        lastContentOffset.value = currentOffset;
        return;
      }

      if (Math.abs(diff) < 10) return;

      if (diff > 0) {
          // Scrolling Down -> Hide
          if (tabBarTranslateY.value !== 100) {
              tabBarTranslateY.value = withTiming(100, { duration: 300 });
          }
      } else {
          // Scrolling Up -> Show
          if (tabBarTranslateY.value !== 0) {
              tabBarTranslateY.value = withTiming(0, { duration: 300 });
          }
      }
      lastContentOffset.value = currentOffset;
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAll(), refetchMy(), refetchFollowing()]);
    setRefreshing(false);
  }, [refetchAll, refetchMy, refetchFollowing]);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [])
  );

  const handleFollow = (communityId: string, action: 'follow' | 'unfollow') => {
    followMutate({ communityId, action });
  };

  const isLoading = isLoadingAll || isLoadingMy || isLoadingFollowing;

  return (
    <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between bg-white/80 dark:bg-[#171f26]/80 backdrop-blur-md sticky top-0 z-50 border-b border-black/5 dark:border-white/5">
        <View className="flex-row items-center gap-3">
          <View className="size-10 rounded-full bg-purple-500/10 items-center justify-center">
            <MaterialIcons name="groups" size={24} color="#9333ea" />
          </View>
          <View>
            <Text className="text-sm font-bold leading-none dark:text-white">Communities</Text>
            <Text className="text-[10px] text-purple-600 font-medium uppercase tracking-wider">Join & Connect</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => router.push('/search')}
            className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm"
          >
            <MaterialIcons name="search" size={24} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/notifications')}
            className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm relative"
          >
            <MaterialIcons name="notifications-none" size={24} color="#64748B" />
            {(unreadCount || 0) > 0 && (
              <View className="absolute top-2.5 right-2.5 size-1.5 bg-[#FF5252] rounded-full ring-1 ring-white dark:ring-[#171f26]" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9333ea" />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {isLoading && !refreshing ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#9333ea" size="large" />
          </View>
        ) : (
          <>
            {/* My Communities Section */}
            {myCommunities && myCommunities.length > 0 && (
              <View className="mt-4">
                <SectionHeader title="My Communities" count={myCommunities.length} badge="Owner" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {myCommunities.map((community: Community) => (
                    <CommunityCard
                      key={community.id}
                      community={{ ...community, isOwner: true }}
                      onPress={() => router.push(`/communities/${community.id}` as any)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Following Section */}
            {followingCommunities && followingCommunities.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Following" count={followingCommunities.length} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {followingCommunities.map((community: Community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onPress={() => router.push(`/communities/${community.id}` as any)}
                      onFollow={(action) => handleFollow(community.id, action)}
                      isFollowing={true}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Discover Section */}
            <View className="mt-6">
              <SectionHeader title="Discover Communities" count={allCommunities?.length} />
              {allCommunities && allCommunities.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {allCommunities.map((community: Community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onPress={() => router.push(`/communities/${community.id}` as any)}
                      onFollow={(action) => handleFollow(community.id, action)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View className="px-4">
                  <View className="bg-white dark:bg-slate-800 p-6 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-600">
                    <MaterialIcons name="groups" size={48} color="#9ca3af" />
                    <Text className="text-gray-400 mt-2 text-center">No communities yet. Be the first to create one!</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Empty State for new users */}
            {(!myCommunities || myCommunities.length === 0) && (!followingCommunities || followingCommunities.length === 0) && (
              <View className="mt-6 px-4">
                <View className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-6 rounded-2xl border border-purple-200 dark:border-purple-800/30">
                  <View className="items-center">
                    <View className="size-16 rounded-2xl bg-purple-500/20 items-center justify-center mb-3">
                      <MaterialIcons name="groups" size={32} color="#9333ea" />
                    </View>
                    <Text className="text-lg font-bold dark:text-white text-center">Create Your Community</Text>
                    <Text className="text-gray-500 text-center text-sm mt-1">
                      Build a space for your club, organization, or interest group
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/communities/create')}
                      className="mt-4 bg-purple-600 px-6 py-3 rounded-xl"
                    >
                      <Text className="text-white font-bold">Create Community</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

      {/* Create Community FAB */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/communities/create')}
        className="absolute bottom-24 right-4 size-14 rounded-full bg-purple-600 items-center justify-center shadow-lg shadow-purple-500/40 border-4 border-white dark:border-[#171f26] z-50"
      >
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
