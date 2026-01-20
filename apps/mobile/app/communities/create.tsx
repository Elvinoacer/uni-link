import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCreateCommunity, useAddCommunityLink } from '../../hooks/useCommunities';
import { useMediaUpload } from '../../hooks/useMediaUpload';

const CATEGORIES = [
  { id: 'academic', label: 'Academic', icon: 'school' },
  { id: 'social', label: 'Social', icon: 'celebration' },
  { id: 'sports', label: 'Sports', icon: 'fitness-center' },
  { id: 'arts', label: 'Arts & Culture', icon: 'palette' },
  { id: 'tech', label: 'Technology', icon: 'computer' },
  { id: 'gaming', label: 'Gaming', icon: 'sports-esports' },
  { id: 'music', label: 'Music', icon: 'music-note' },
  { id: 'other', label: 'Other', icon: 'category' },
];

const PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', color: '#25D366' },
  { id: 'twitter', label: 'Twitter/X', icon: 'tag', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', icon: 'photo-camera', color: '#E4405F' },
  { id: 'telegram', label: 'Telegram', icon: 'send', color: '#0088cc' },
  { id: 'discord', label: 'Discord', icon: 'headset', color: '#5865F2' },
  { id: 'other', label: 'Other', icon: 'link', color: '#6366f1' },
] as const;

export default function CreateCommunityScreen() {
  const router = useRouter();
  const { mutate: createCommunity, isPending: isCreating } = useCreateCommunity();
  const { mutate: addLink, isPending: isAddingLink } = useAddCommunityLink();
  const { uploadMedia, isUploading } = useMediaUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  
  // Images (Local URIs initially)
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  
  // External Link
  const [linkPlatform, setLinkPlatform] = useState<typeof PLATFORMS[number]['id']>('whatsapp');
  const [linkUrl, setLinkUrl] = useState('');

  const pickImage = async (type: 'avatar' | 'banner') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Using array to avoid deprecation warning
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'avatar') {
        setAvatarUri(uri);
      } else {
        setBannerUri(uri);
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    try {
      let uploadedAvatarUrl = undefined;
      let uploadedBannerUrl = undefined;

      // Upload images if they are local (selected from picker)
      if (avatarUri && avatarUri.startsWith('file://')) {
        const url = await uploadMedia(avatarUri);
        if (url) uploadedAvatarUrl = url;
      }

      if (bannerUri && bannerUri.startsWith('file://')) {
        const url = await uploadMedia(bannerUri);
        if (url) uploadedBannerUrl = url;
      }

      createCommunity(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          avatarUrl: uploadedAvatarUrl,
          bannerUrl: uploadedBannerUrl,
        },
        {
          onSuccess: (result) => {
            const communityId = result.data.id;
            
            // If link provided, add it
            if (linkUrl.trim()) {
               addLink(
                {
                  communityId,
                  data: {
                    platform: linkPlatform,
                    url: linkUrl.trim(),
                    label: `Join our ${PLATFORMS.find(p => p.id === linkPlatform)?.label} channel`,
                  },
                },
                {
                  onSuccess: () => {
                    Alert.alert('Success', 'Community created successfully!');
                    router.replace(`/communities/${communityId}` as any);
                  },
                  onError: () => {
                    // Start navigation anyway even if link fails (corner case)
                    Alert.alert('Success', 'Community created (Link failed to add)');
                    router.replace(`/communities/${communityId}` as any);
                  }
                }
              );
            } else {
              Alert.alert('Success', 'Community created successfully!');
              router.replace(`/communities/${communityId}` as any);
            }
          },
          onError: (error) => {
            console.error(error);
            Alert.alert('Error', 'Failed to create community');
          },
        }
      );
    } catch (error) {
      console.error('Pre-create error:', error);
      Alert.alert('Error', 'Failed to prepare community data (Image upload failed?)');
    }
  };

  const isPending = isCreating || isUploading || isAddingLink;

  return (
    <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} disabled={isPending}>
          <MaterialIcons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-bold dark:text-white">Create Community</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isPending || !name.trim()}
          className={`px-4 py-2 rounded-lg ${isPending || !name.trim() ? 'bg-gray-300' : 'bg-purple-600'}`}
        >
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Banner Picker */}
        <TouchableOpacity
          onPress={() => pickImage('banner')}
          className="h-32 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl mb-4 overflow-hidden items-center justify-center relative"
          disabled={isPending}
        >
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <MaterialIcons name="add-photo-alternate" size={32} color="white" />
              <Text className="text-white text-xs mt-1">Add Banner Image</Text>
            </View>
          )}
          
          {/* Change Overlay */}
          {bannerUri && (
            <View className="absolute inset-0 bg-black/20 items-center justify-center">
              <MaterialIcons name="edit" size={24} color="white" />
            </View>
          )}
        </TouchableOpacity>

        {/* Avatar Picker */}
        <View className="-mt-12 ml-4 mb-4">
          <TouchableOpacity
            onPress={() => pickImage('avatar')}
            className="size-20 rounded-2xl bg-white dark:bg-slate-700 items-center justify-center border-4 border-[#faf6f0] dark:border-[#171f26] overflow-hidden shadow-lg relative"
            disabled={isPending}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} className="size-20" />
            ) : (
              <View className="items-center">
                <MaterialIcons name="add-a-photo" size={24} color="#9333ea" />
              </View>
            )}
            
            {/* Change Overlay */}
            {avatarUri && (
              <View className="absolute inset-0 bg-black/20 items-center justify-center">
                <MaterialIcons name="edit" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Name Input */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Community Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter community name"
            placeholderTextColor="#9ca3af"
            className="bg-white dark:bg-slate-800 p-4 rounded-xl text-base dark:text-white border border-gray-200 dark:border-gray-700"
            maxLength={100}
            editable={!isPending}
          />
        </View>

        {/* Description Input */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's your community about?"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-white dark:bg-slate-800 p-4 rounded-xl text-base dark:text-white border border-gray-200 dark:border-gray-700 min-h-[100px]"
            maxLength={500}
            editable={!isPending}
          />
        </View>

        {/* Category Selector */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                disabled={isPending}
                className={`flex-row items-center gap-2 px-4 py-2 rounded-full mr-2 border ${
                  category === cat.id
                    ? 'bg-purple-600 border-purple-600'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <MaterialIcons
                  name={cat.icon as any}
                  size={16}
                  color={category === cat.id ? 'white' : '#9ca3af'}
                />
                <Text
                  className={`text-sm font-medium ${
                    category === cat.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Communication Link Section */}
        <View className="bg-purple-50 dark:bg-slate-800/50 p-4 rounded-xl border border-purple-200 dark:border-purple-800/30 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="link" size={20} color="#9333ea" />
            <Text className="text-sm font-bold text-gray-800 dark:text-gray-200">Main Communication Channel</Text>
          </View>
          
          {/* Platform Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setLinkPlatform(p.id)}
                disabled={isPending}
                className={`size-10 rounded-full items-center justify-center mr-2 border ${
                  linkPlatform === p.id ? 'border-purple-600 bg-purple-100 dark:bg-slate-700' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800'
                }`}
              >
                <MaterialIcons name={p.icon as any} size={20} color={p.color} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* URL Input */}
          <TextInput
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder={`Paste your ${PLATFORMS.find(p => p.id === linkPlatform)?.label} link here`}
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="url"
            className="bg-white dark:bg-slate-900 p-3 rounded-xl text-sm dark:text-white border border-gray-200 dark:border-gray-700"
            editable={!isPending}
          />
        </View>

        {/* Info Card */}
        <View className="flex-row items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <MaterialIcons name="info-outline" size={20} color="#64748B" />
          <Text className="flex-1 text-xs text-gray-500 dark:text-gray-400">
            You can verify your community and add more communication channels (Discord, Slack, etc.) after creation.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
