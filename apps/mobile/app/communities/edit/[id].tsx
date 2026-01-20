import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCommunity, useUpdateCommunity } from '../../../hooks/useCommunities';
import { useMediaUpload } from '../../../hooks/useMediaUpload';

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

export default function EditCommunityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: community, isLoading: isLoadingCommunity } = useCommunity(id);
  const { mutate: updateCommunity, isPending } = useUpdateCommunity();
  const { uploadMedia, isUploading } = useMediaUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    if (community) {
      setName(community.name || '');
      setDescription(community.description || '');
      setCategory(community.category || '');
      setAvatarUrl(community.avatarUrl || '');
      setBannerUrl(community.bannerUrl || '');
      setAvatarPreview(community.avatarUrl || null);
      setBannerPreview(community.bannerUrl || null);
    }
  }, [community]);

  const pickImage = async (type: 'avatar' | 'banner') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'avatar') {
        setAvatarPreview(uri);
      } else {
        setBannerPreview(uri);
      }

      try {
        const uploadedUrl = await uploadMedia(uri, 'image');
        if (uploadedUrl) {
          if (type === 'avatar') {
            setAvatarUrl(uploadedUrl);
          } else {
            setBannerUrl(uploadedUrl);
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const handleUpdate = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    updateCommunity(
      {
        id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          avatarUrl: avatarUrl || undefined,
          bannerUrl: bannerUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Community updated successfully!');
          router.back();
        },
        onError: () => {
          Alert.alert('Error', 'Failed to update community');
        },
      }
    );
  };

  if (isLoadingCommunity) {
    return (
      <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26] items-center justify-center">
        <ActivityIndicator color="#9333ea" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-bold dark:text-white">Edit Community</Text>
        <TouchableOpacity
          onPress={handleUpdate}
          disabled={isPending || isUploading || !name.trim()}
          className={`px-4 py-2 rounded-lg ${isPending || isUploading ? 'bg-gray-300' : 'bg-purple-600'}`}
        >
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Banner Picker */}
        <TouchableOpacity
          onPress={() => pickImage('banner')}
          className="h-32 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl mb-4 overflow-hidden items-center justify-center"
        >
          {bannerPreview ? (
            <Image source={{ uri: bannerPreview }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <MaterialIcons name="add-photo-alternate" size={32} color="white" />
              <Text className="text-white text-xs mt-1">Change Banner Image</Text>
            </View>
          )}
          {isUploading && (
            <View className="absolute inset-0 bg-black/50 items-center justify-center">
              <ActivityIndicator color="white" />
            </View>
          )}
        </TouchableOpacity>

        {/* Avatar Picker */}
        <View className="-mt-12 ml-4 mb-4">
          <TouchableOpacity
            onPress={() => pickImage('avatar')}
            className="size-20 rounded-2xl bg-white dark:bg-slate-700 items-center justify-center border-4 border-[#faf6f0] dark:border-[#171f26] overflow-hidden shadow-lg"
          >
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} className="size-20" />
            ) : (
              <MaterialIcons name="add-a-photo" size={24} color="#9333ea" />
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
          />
        </View>

        {/* Category Selector */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
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
      </ScrollView>
    </SafeAreaView>
  );
}
