import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, RefreshControl, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useConversations } from '../../hooks/useChat';
import { Conversation } from '@uni-social/shared-types';
import { useAuthStore } from '../../store/authStore';
import { NewChatModal } from '../../components/chat/NewChatModal';

// Simple time ago formatter
const formatTimeAgo = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

export default function MessagesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useConversations();
  
  const { user } = useAuthStore();
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState(false);

  // Flatten pages
  const allConversations = data?.pages.flatMap(page => Array.isArray(page) ? page : (page.conversations || [])) || [];

  const filteredConversations = allConversations.filter((c: Conversation) => {
      // Backend returns otherUser directly
      const otherUser = (c as any).otherUser;
      
      if (otherUser) {
          const name = otherUser.displayName || otherUser.username || 'User';
          return name.toLowerCase().includes(searchQuery.toLowerCase());
      }

      // Fallback for types that might expect participants
      const participants = c.participants || [];
      const participant = participants.find(p => p.id !== user?.id) || participants[0];
      const name = participant?.displayName || participant?.username || 'User';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getOtherParticipant = (convo: Conversation) => {
      const otherUser = (convo as any).otherUser;
      if (otherUser) return otherUser;
      
      return convo.participants?.find(p => p.id !== user?.id) || convo.participants?.[0];
  };

  const handleSelectUser = (selectedUser: any) => {
    setIsNewChatModalVisible(false);
    
    // Check if we already have a conversation with this user in our loaded list
    const existingConvo = allConversations.find(c => 
      c.participants.some((p: any) => p.id === selectedUser.id)
    );

    router.push({
      pathname: `/chat/[id]`,
      params: { 
        id: existingConvo ? existingConvo.id : 'new', 
        recipientId: selectedUser.id,
        name: selectedUser.displayName || selectedUser.username, 
        avatar: selectedUser.avatarUrl || '',
        verified: selectedUser.isVerified ? 'true' : 'false',
        department: (selectedUser as any).department || ''
      }
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => {
      const otherUser = getOtherParticipant(item);
      const name = otherUser?.displayName || otherUser?.username || 'Unknown User';
      const avatar = otherUser?.avatarUrl;
      
      const isUnread = (item.unreadCount || 0) > 0;

      return (
        <TouchableOpacity
          onPress={() => router.push({
            pathname: `/chat/[id]`,
            params: { 
                id: item.id, 
                recipientId: otherUser?.id,
                name: name, 
                avatar: avatar || '',
                verified: otherUser?.isVerified ? 'true' : 'false',
                department: (otherUser as any)?.department || ''
            }
          })}
          className="flex-row items-center px-4 py-3 active:bg-gray-50 dark:active:bg-gray-900"
        >
          <View className="relative">
            {avatar ? (
                <Image source={{ uri: avatar }} className="size-14 rounded-full bg-gray-200" />
            ) : (
                <View className="size-14 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center">
                    <Text className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
                        {getInitials(name)}
                    </Text>
                </View>
            )}
            {/* Online status would go here if/when supported */}
          </View>
          
          <View className="flex-1 ml-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1 flex-1">
                <Text 
                  className={`font-semibold dark:text-white ${isUnread ? 'text-black' : 'text-gray-700'}`}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {otherUser?.isVerified && (
                  <MaterialIcons name="verified" size={14} color="#1990e6" />
                )}
              </View>
              <Text className={`text-xs ${isUnread ? 'text-[#1990e6] font-bold' : 'text-gray-400'}`}>
                {item.lastMessage?.createdAt ? formatTimeAgo(item.lastMessage.createdAt) : ''}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between mt-1">
              <Text 
                className={`text-sm flex-1 ${isUnread ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500'}`}
                numberOfLines={1}
              >
                {item.lastMessage?.content || 'Started a conversation'}
              </Text>
              {isUnread && (
                <View className="size-2.5 bg-[#1990e6] rounded-full ml-2" />
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#121212]">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color="#64748B" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold dark:text-white">Messages</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsNewChatModalVisible(true)}
          className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
        >
          <MaterialIcons name="edit" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Encryption Notice */}
      <View className="bg-[#1990e6]/5 py-2 px-4 flex-row items-center justify-center gap-2">
        <MaterialIcons name="lock" size={14} color="#1990e6" />
        <Text className="text-xs text-[#1990e6] font-medium">
          All messages are end-to-end encrypted
        </Text>
      </View>

      {/* Search */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 h-11">
          <MaterialIcons name="search" size={20} color="#94A3B8" />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm dark:text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1990e6" />
        }
        onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
            !isLoading ? (
                <View className="items-center py-20">
                    <MaterialIcons name="chat-bubble-outline" size={48} color="#ccc" />
                    <Text className="text-gray-400 mt-2">No conversations found</Text>
                </View>
            ) : null
        }
        ListFooterComponent={
             isLoading || isFetchingNextPage ? (
                 <View className="py-4">
                     <ActivityIndicator size="small" color="#1990e6" />
                 </View>
             ) : null
        }
      />
      <NewChatModal 
        visible={isNewChatModalVisible}
        onClose={() => setIsNewChatModalVisible(false)}
        onSelectUser={handleSelectUser}
      />
    </SafeAreaView>
  );
}
