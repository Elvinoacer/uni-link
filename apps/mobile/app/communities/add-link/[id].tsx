import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import clsx from 'clsx';
import { useAddCommunityLink } from '../../../hooks/useCommunities';

const PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', color: '#25D366' },
  { id: 'twitter', label: 'Twitter/X', icon: 'tag', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', icon: 'photo-camera', color: '#E4405F' },
  { id: 'telegram', label: 'Telegram', icon: 'send', color: '#0088cc' },
  { id: 'discord', label: 'Discord', icon: 'headset', color: '#5865F2' },
  { id: 'other', label: 'Other', icon: 'link', color: '#6366f1' },
] as const;

type PlatformType = typeof PLATFORMS[number]['id'];

export default function AddLinkScreen() {
  const router = useRouter();
  const { id: communityId } = useLocalSearchParams<{ id: string }>();
  const { mutate: addLink, isPending } = useAddCommunityLink();

  const [platform, setPlatform] = useState<PlatformType>('whatsapp');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  const handleSubmit = () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Error', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    addLink(
      {
        communityId,
        data: {
          platform,
          url: url.trim(),
          label: label.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Link added successfully!');
          router.back();
        },
        onError: () => {
          Alert.alert('Error', 'Failed to add link');
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
        <Text className="text-lg font-bold dark:text-white">Add External Link</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending || !url.trim()}
          className={`px-4 py-2 rounded-lg ${isPending ? 'bg-gray-300' : 'bg-purple-600'}`}
        >
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Add</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Platform Selector */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Select Platform</Text>
          <View className="flex-row flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPlatform(p.id)}
                className={clsx(
                  "flex-row items-center gap-2 px-4 py-3 rounded-xl border",
                  platform === p.id
                    ? "border-2"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
                )}
                style={platform === p.id ? { borderColor: p.color, backgroundColor: p.color + '15' } : undefined}
              >
                <MaterialIcons
                  name={p.icon as any}
                  size={20}
                  color={platform === p.id ? p.color : '#9ca3af'}
                />
                <Text
                  className={clsx(
                    "font-medium",
                    platform === p.id ? "font-bold" : "text-gray-600 dark:text-gray-400"
                  )}
                  style={platform === p.id ? { color: p.color } : undefined}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* URL Input */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Link URL *</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="url"
            className="bg-white dark:bg-slate-800 p-4 rounded-xl text-base dark:text-white border border-gray-200 dark:border-gray-700"
          />
          <Text className="text-xs text-gray-500 mt-1">
            Enter the full URL including https://
          </Text>
        </View>

        {/* Label Input */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Label (Optional)</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g., Join our WhatsApp group"
            placeholderTextColor="#9ca3af"
            className="bg-white dark:bg-slate-800 p-4 rounded-xl text-base dark:text-white border border-gray-200 dark:border-gray-700"
            maxLength={50}
          />
        </View>

        {/* Preview */}
        <View className="mt-4">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Preview</Text>
          <View className="flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <View
              className="size-10 rounded-lg items-center justify-center"
              style={{ backgroundColor: PLATFORMS.find(p => p.id === platform)?.color + '20' }}
            >
              <MaterialIcons
                name={PLATFORMS.find(p => p.id === platform)?.icon as any}
                size={20}
                color={PLATFORMS.find(p => p.id === platform)?.color}
              />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-sm dark:text-white">
                {label || PLATFORMS.find(p => p.id === platform)?.label}
              </Text>
              <Text className="text-xs text-gray-500" numberOfLines={1}>
                {url || 'https://...'}
              </Text>
            </View>
            <MaterialIcons name="open-in-new" size={18} color="#9ca3af" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
