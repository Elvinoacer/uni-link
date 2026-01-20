import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCreateCommunityPost, useCommunity } from '../../../hooks/useCommunities';
import { useMediaUpload } from '../../../hooks/useMediaUpload';

export default function CreateCommunityPostScreen() {
  const router = useRouter();
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const { data: community } = useCommunity(communityId);
  const { mutate: createPost, isPending } = useCreateCommunityPost();
  const { uploadMedia, isUploading } = useMediaUpload();

  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map(a => a.uri);
      setMediaPreviews(prev => [...prev, ...uris]);

      // Upload images
      for (const uri of uris) {
        try {
          const uploadedUrl = await uploadMedia(uri, 'image');
          if (uploadedUrl) {
            setMediaUrls(prev => [...prev, uploadedUrl]);
          }
        } catch (error) {
          console.error('Upload error:', error);
        }
      }
    }
  };

  const removeMedia = (index: number) => {
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    createPost(
      {
        communityId,
        data: {
          content: content.trim(),
          mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Post published!');
          router.back();
        },
        onError: () => {
          Alert.alert('Error', 'Failed to create post');
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-bold dark:text-white">New Post</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending || isUploading || !content.trim()}
          className={`px-4 py-2 rounded-lg ${isPending || isUploading ? 'bg-gray-300' : 'bg-purple-600'}`}
        >
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Community Badge */}
        {community && (
          <View className="flex-row items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl mb-4 border border-purple-200 dark:border-purple-800/30">
            <View className="size-10 rounded-lg bg-purple-500/20 items-center justify-center overflow-hidden">
              {community.avatarUrl ? (
                <Image source={{ uri: community.avatarUrl }} className="size-10" />
              ) : (
                <MaterialIcons name="groups" size={20} color="#9333ea" />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-bold text-sm text-purple-700 dark:text-purple-300">
                Posting to {community.name}
              </Text>
              <Text className="text-xs text-purple-600 dark:text-purple-400">
                This will be visible to all followers
              </Text>
            </View>
          </View>
        )}

        {/* Content Input */}
        <View className="mb-4">
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What would you like to share with your community?"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-white dark:bg-slate-800 p-4 rounded-xl text-base dark:text-white border border-gray-200 dark:border-gray-700 min-h-[150px]"
            maxLength={2000}
          />
          <Text className="text-xs text-gray-500 text-right mt-1">{content.length}/2000</Text>
        </View>

        {/* Media Previews */}
        {mediaPreviews.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Attached Media</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mediaPreviews.map((uri, index) => (
                <View key={index} className="relative mr-2">
                  <Image source={{ uri }} className="w-24 h-24 rounded-xl" resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-red-500 items-center justify-center"
                  >
                    <MaterialIcons name="close" size={14} color="white" />
                  </TouchableOpacity>
                  {isUploading && mediaUrls.length <= index && (
                    <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                      <ActivityIndicator color="white" size="small" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Add Media Button */}
        <TouchableOpacity
          onPress={pickImage}
          disabled={mediaPreviews.length >= 4}
          className="flex-row items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 mb-4"
        >
          <MaterialIcons
            name="add-photo-alternate"
            size={24}
            color={mediaPreviews.length >= 4 ? '#9ca3af' : '#9333ea'}
          />
          <Text className={mediaPreviews.length >= 4 ? 'text-gray-400' : 'text-purple-600 font-bold'}>
            {mediaPreviews.length >= 4 ? 'Max 4 images' : 'Add Images'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
