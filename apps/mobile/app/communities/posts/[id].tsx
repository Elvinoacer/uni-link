import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import { PostItem } from '../../../components/feed/PostItem';
import { transformPost } from '../../../utils/transformers';

export default function CommunityPostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = React.useState('');

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['community-post', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/communities/posts/${id}`);
      return transformPost(data.data);
    }
  });

  const { mutate: sendReply, isPending: isSendingReply } = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post(`/communities/posts/${id}/reply`, { content });
      return data.data;
    },
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['community-post', id] });
    },
    onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.error || 'Failed to send reply');
    }
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#000000]">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#000000] p-4">
        <Text className="text-red-500 mb-4">Error loading post</Text>
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-200 rounded">
            <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Stack.Screen options={{ 
            headerShown: false
        }} />
        
        <View className="flex-1 bg-white dark:bg-[#000000]">
            <View className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <MaterialIcons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <Text className="text-lg font-bold dark:text-white">Post</Text>
            </View>

            <ScrollView className="flex-1">
                <PostItem post={post} />
                
                {/* View Community Button */}
                {post.communityId && (
                    <TouchableOpacity 
                        className="flex-row items-center justify-center gap-2 mx-4 my-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800"
                        onPress={() => router.push(`/communities/${post.communityId}` as any)}
                    >
                        <MaterialIcons name="groups" size={20} color="#9333ea" />
                        <Text className="font-bold text-purple-700 dark:text-purple-300">
                            View {post.community?.name} Community
                        </Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#9333ea" />
                    </TouchableOpacity>
                )}

                <View className="h-[1px] bg-gray-100 dark:bg-gray-800 my-2" />
                
                <Text className="px-4 py-2 font-bold text-lg text-gray-900 dark:text-gray-100">
                    Replies
                </Text>

                {post.replies && post.replies.length > 0 ? (
                    post.replies.map((reply: any) => (
                        <View key={reply.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                             <View className="flex-row gap-3">
                                <Image 
                                    source={reply.author.avatar || 'https://via.placeholder.com/40'} 
                                    style={{ width: 32, height: 32, borderRadius: 16 }}
                                    contentFit="cover"
                                />
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <Text className="font-bold text-[#111818] dark:text-gray-100 text-sm">
                                            {reply.author.name}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {reply.author.handle ? `@${reply.author.handle}` : ''} · {reply.createdAt}
                                        </Text>
                                    </View>
                                    <Text className="text-[#0F1419] dark:text-gray-300 text-sm leading-5">
                                        {reply.content}
                                    </Text>
                                </View>
                             </View>
                        </View>
                    ))
                ) : (
                    <View className="py-8 items-center justify-center">
                        <Text className="text-gray-400">No replies yet. Be the first to reply!</Text>
                    </View>
                )}
                
                <View className="h-20" /> 
            </ScrollView>

            {/* Reply Input */}
            <View 
                className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-[#000000]"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
                <View className="flex-row items-center gap-3">
                     <Image 
                        source={user?.avatarUrl || 'https://via.placeholder.com/40'} 
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                        contentFit="cover"
                    />
                    <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-900 rounded-full px-4 py-2">
                        <TextInput
                            placeholder="Post your reply"
                            placeholderTextColor="#64748B"
                            className="flex-1 text-[#0F1419] dark:text-gray-100 text-[15px] max-h-24"
                            multiline
                            value={replyContent}
                            onChangeText={setReplyContent}
                        />
                    </View>
                    <TouchableOpacity 
                        disabled={!replyContent.trim() || isSendingReply}
                        onPress={() => sendReply(replyContent)}
                        className={`p-2 rounded-full ${(!replyContent.trim() || isSendingReply) ? 'opacity-50' : 'bg-[#4F46E5]'}`}
                    >
                         <MaterialIcons name="send" size={20} color={(!replyContent.trim() || isSendingReply) ? '#64748B' : 'white'} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
