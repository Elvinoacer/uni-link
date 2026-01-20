import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import clsx from 'clsx';
import { useCommunity, useCommunityPosts, useFollowCommunity, useDeleteCommunity } from '../../hooks/useCommunities';
import { CommunityLink, CommunityPost } from '../../services/community.service';

// Platform icons and colors
const PLATFORM_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string; label: string }> = {
  whatsapp: { icon: 'chat', color: '#25D366', label: 'WhatsApp' },
  twitter: { icon: 'tag', color: '#1DA1F2', label: 'Twitter/X' },
  facebook: { icon: 'facebook', color: '#1877F2', label: 'Facebook' },
  instagram: { icon: 'photo-camera', color: '#E4405F', label: 'Instagram' },
  telegram: { icon: 'send', color: '#0088cc', label: 'Telegram' },
  discord: { icon: 'headset', color: '#5865F2', label: 'Discord' },
  other: { icon: 'link', color: '#6366f1', label: 'Link' },
};

// External Link Button
function ExternalLinkButton({ link }: { link: CommunityLink }) {
  const config = PLATFORM_CONFIG[link.platform] || PLATFORM_CONFIG.other;
  
  const handlePress = async () => {
    try {
      await Linking.openURL(link.url);
    } catch (error) {
      Alert.alert('Error', 'Could not open link');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-black/5 dark:border-white/5 mb-2"
      activeOpacity={0.8}
    >
      <View 
        className="size-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: config.color + '20' }}
      >
        <MaterialIcons name={config.icon} size={20} color={config.color} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-sm dark:text-white">{link.label || config.label}</Text>
        <Text className="text-xs text-gray-500" numberOfLines={1}>{link.url}</Text>
      </View>
      <MaterialIcons name="open-in-new" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

// Community Post Card
function PostCard({ post }: { post: CommunityPost }) {
  const mediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
  
  return (
    <View className="bg-white dark:bg-slate-800 p-4 rounded-2xl mb-3 border border-black/5 dark:border-white/5">
      {/* Author */}
      <View className="flex-row items-center gap-3 mb-3">
        {post.author?.avatarUrl ? (
          <Image source={{ uri: post.author.avatarUrl }} className="size-10 rounded-full" />
        ) : (
          <View className="size-10 rounded-full bg-purple-500/20 items-center justify-center">
            <MaterialIcons name="person" size={20} color="#9333ea" />
          </View>
        )}
        <View className="flex-1">
          <Text className="font-bold text-sm dark:text-white">
            {post.author?.displayName || post.author?.username || 'Community'}
          </Text>
          <Text className="text-xs text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      {/* Content */}
      <Text className="text-sm dark:text-white mb-3">{post.content}</Text>
      
      {/* Media */}
      {mediaUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          {mediaUrls.map((url: string, idx: number) => (
            <Image
              key={idx}
              source={{ uri: url }}
              className="w-48 h-32 rounded-xl mr-2"
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}
      
      {/* Stats */}
      <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="favorite-border" size={18} color="#9ca3af" />
          <Text className="text-xs text-gray-500">{post.likesCount || 0}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CommunityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const { data: community, isLoading, refetch } = useCommunity(id);
  const { data: posts, isLoading: isLoadingPosts } = useCommunityPosts(id);
  const { mutate: followMutate } = useFollowCommunity();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteCommunity();

  const handleFollow = () => {
    if (!community) return;
    setIsFollowLoading(true);
    const action = community.isFollowing ? 'unfollow' : 'follow';
    followMutate(
      { communityId: id, action },
      {
        onSuccess: () => {
          refetch();
          setIsFollowLoading(false);
        },
        onError: () => {
          setIsFollowLoading(false);
        },
      }
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Community',
      'Are you sure you want to delete this community? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutate(id, {
              onSuccess: () => {
                router.back();
              },
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26] items-center justify-center">
        <ActivityIndicator color="#9333ea" size="large" />
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26] items-center justify-center">
        <MaterialIcons name="error-outline" size={48} color="#9ca3af" />
        <Text className="text-gray-500 mt-2">Community not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Banner */}
        <View className="h-40 bg-gradient-to-b from-purple-500 to-indigo-600 relative">
          {community.bannerUrl && (
            <Image source={{ uri: community.bannerUrl }} className="w-full h-full" resizeMode="cover" />
          )}
          
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-4 left-4 size-10 rounded-full bg-black/30 items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Edit/Delete for owner */}
          {community.isOwner && (
            <View className="absolute top-4 right-4 flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.push(`/communities/edit/${id}` as any)}
                className="size-10 rounded-full bg-black/30 items-center justify-center"
              >
                <MaterialIcons name="edit" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                className="size-10 rounded-full bg-red-500/80 items-center justify-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <MaterialIcons name="delete" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Avatar & Info */}
        <View className="px-4 -mt-12">
          <View className="flex-row items-end gap-4">
            <View className="size-24 rounded-2xl bg-white dark:bg-slate-700 items-center justify-center border-4 border-[#faf6f0] dark:border-[#171f26] overflow-hidden shadow-lg">
              {community.avatarUrl ? (
                <Image source={{ uri: community.avatarUrl }} className="size-24" />
              ) : (
                <MaterialIcons name="groups" size={40} color="#9333ea" />
              )}
            </View>
            
            {/* Follow Button */}
            {!community.isOwner && (
              <TouchableOpacity
                onPress={handleFollow}
                disabled={isFollowLoading}
                className={clsx(
                  "flex-1 py-3 rounded-xl items-center mb-1",
                  community.isFollowing ? "bg-gray-100 dark:bg-slate-700" : "bg-purple-600"
                )}
              >
                {isFollowLoading ? (
                  <ActivityIndicator color={community.isFollowing ? "#9333ea" : "white"} size="small" />
                ) : (
                  <Text className={clsx("font-bold", community.isFollowing ? "text-gray-600 dark:text-gray-300" : "text-white")}>
                    {community.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {community.isOwner && (
              <View className="flex-1 py-3 rounded-xl items-center mb-1 bg-purple-500/10">
                <Text className="font-bold text-purple-600">You own this community</Text>
              </View>
            )}
          </View>
          
          {/* Name & Description */}
          <View className="mt-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold dark:text-white">{community.name}</Text>
              {community.isVerified && (
                <MaterialIcons name="verified" size={20} color="#3b82f6" />
              )}
            </View>
            {community.category && (
              <View className="flex-row items-center gap-1 mt-1">
                <MaterialIcons name="category" size={14} color="#9ca3af" />
                <Text className="text-xs text-gray-500 capitalize">{community.category}</Text>
              </View>
            )}
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {community.description || 'No description provided.'}
            </Text>
          </View>
          
          {/* Stats */}
          <View className="flex-row items-center gap-6 mt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <View className="items-center">
              <Text className="text-lg font-bold dark:text-white">{community.followersCount || 0}</Text>
              <Text className="text-xs text-gray-500">Followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold dark:text-white">{community.postsCount || 0}</Text>
              <Text className="text-xs text-gray-500">Posts</Text>
            </View>
          </View>
        </View>

        {/* External Links */}
        {community.links && community.links.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-lg font-bold dark:text-white mb-3">Join Our Channels</Text>
            {community.links.map((link: CommunityLink) => (
              <ExternalLinkButton key={link.id} link={link} />
            ))}
          </View>
        )}
        
        {/* Add Link Button for owner */}
        {community.isOwner && (
          <TouchableOpacity
            onPress={() => router.push(`/communities/add-link/${id}` as any)}
            className="mx-4 mt-2 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700"
          >
            <MaterialIcons name="add-link" size={20} color="#9333ea" />
            <Text className="font-bold text-purple-600">Add External Link</Text>
          </TouchableOpacity>
        )}

        {/* Posts Section */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold dark:text-white">Posts</Text>
            {community.isOwner && (
              <TouchableOpacity
                onPress={() => router.push(`/communities/post/${id}` as any)}
                className="flex-row items-center gap-1 bg-purple-600 px-3 py-1.5 rounded-lg"
              >
                <MaterialIcons name="add" size={16} color="white" />
                <Text className="text-white text-xs font-bold">New Post</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isLoadingPosts ? (
            <ActivityIndicator color="#9333ea" />
          ) : posts && posts.length > 0 ? (
            posts.map((post: CommunityPost) => <PostCard key={post.id} post={post} />)
          ) : (
            <View className="bg-white dark:bg-slate-800 p-6 rounded-2xl items-center border border-dashed border-gray-300 dark:border-gray-600">
              <MaterialIcons name="article" size={32} color="#9ca3af" />
              <Text className="text-gray-500 mt-2 text-center">No posts yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
