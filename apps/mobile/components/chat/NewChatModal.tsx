import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useFollowers } from '../../hooks/useProfile';
import { useConversations } from '../../hooks/useChat';
import { getUserAvatar } from '../../utils/images';
import { Conversation, User } from '@uni-social/shared-types';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: any) => void;
}

export function NewChatModal({ visible, onClose, onSelectUser }: NewChatModalProps) {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: followers, isLoading: isLoadingFollowers } = useFollowers(currentUser?.id || '');
  const { data: conversationsData, isLoading: isLoadingConvos } = useConversations();

  const isLoading = isLoadingFollowers || isLoadingConvos;

  const sortedFollowers = useMemo(() => {
    if (!followers) return [];

    // Get recent chat participant IDs
    const recentParticipantIds = new Set<string>();
    conversationsData?.pages.forEach(page => {
      const convos = Array.isArray(page) ? page : (page.conversations || []);
      convos.forEach((c: any) => {
        const otherUser = c.participants?.find((p: any) => p.id !== currentUser?.id);
        if (otherUser) recentParticipantIds.add(otherUser.id);
      });
    });

    // Filter by search query
    const filtered = followers.filter((f: any) => {
      const name = f.displayName || f.username || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Sort: prioritized recent chats, then name
    return [...filtered].sort((a: any, b: any) => {
      const aRecent = recentParticipantIds.has(a.id);
      const bRecent = recentParticipantIds.has(b.id);

      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;

      const aName = a.displayName || a.username || '';
      const bName = b.displayName || b.username || '';
      return aName.localeCompare(bName);
    });
  }, [followers, conversationsData, currentUser?.id, searchQuery]);

  const renderItem = ({ item }: { item: any }) => {
    const name = item.displayName || item.username;
    const avatar = getUserAvatar(item.avatarUrl, name);

    return (
      <TouchableOpacity 
        onPress={() => onSelectUser(item)}
        className="flex-row items-center px-5 py-3 active:bg-gray-50 dark:active:bg-gray-900 border-b border-gray-50 dark:border-gray-800/50"
      >
        <Image source={{ uri: avatar }} className="w-12 h-12 rounded-full bg-gray-100" />
        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-1">
            <Text className="font-bold text-[15px] dark:text-gray-100">{name}</Text>
            {item.isVerified && (
              <MaterialIcons name="verified" size={14} color="#1990e6" />
            )}
          </View>
          <Text className="text-gray-500 text-xs">@{item.username}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-[#121212]">
        {/* Header */}
        <View className="px-5 pt-12 pb-4 flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity onPress={onClose} className="p-1">
            <MaterialIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-lg font-bold dark:text-white">New Message</Text>
          <View className="w-8" /> 
        </View>

        {/* Search */}
        <View className="px-5 py-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 h-12">
            <MaterialIcons name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Search followers..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-base dark:text-white"
              autoFocus
            />
          </View>
        </View>

        {/* List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1990e6" />
          </View>
        ) : (
          <FlatList
            data={sortedFollowers}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View className="items-center py-20 px-10">
                <MaterialIcons name="people-outline" size={48} color="#E2E8F0" />
                <Text className="text-gray-400 mt-4 text-center">
                  {searchQuery ? "No matching followers found" : "You're not following anyone yet. Follow users to start chatting!"}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
