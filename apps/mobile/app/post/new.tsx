import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCreatePost } from '../../hooks/usePosts';
import { useMediaUpload, UploadedFile } from '../../hooks/useMediaUpload';
import { useAuthStore } from '../../store/authStore';
import { getUserAvatar } from '../../utils/images';

export default function NewPostScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState<'real' | 'alias'>('real');
  const [text, setText] = useState('');
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const { user } = useAuthStore();

  // Poll State
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const { mutate: createPost, isPending } = useCreatePost();
  const { pickImage, uploadFiles, isUploading } = useMediaUpload();

  const userAvatar = getUserAvatar(user?.avatarUrl, user?.displayName || user?.username || 'User');

  const handlePickImage = async () => {
    if (showPoll) {
      Alert.alert('Not supported', 'You cannot attach media to a poll.');
      return;
    }

    const remainingSlots = 10 - mediaItems.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can only upload up to 10 images per post.');
      return;
    }

    const assets = await pickImage();
    if (assets && assets.length > 0) {
      const newAssets = assets.slice(0, remainingSlots);
      if (assets.length > remainingSlots) {
        Alert.alert('Partial Selection', `Only the first ${remainingSlots} selected images were added to stay within the 10-image limit.`);
      }
      setMediaItems([...mediaItems, ...newAssets]);
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...mediaItems];
    newMedia.splice(index, 1);
    setMediaItems(newMedia);
  };

  const togglePoll = () => {
    if (mediaItems.length > 0 && !showPoll) {
      Alert.alert('Not supported', 'You cannot add a poll to a post with media.');
      return;
    }
    setShowPoll(!showPoll);
    if (!showPoll) {
      setPollQuestion('');
      setPollOptions(['', '']);
    }
  };

  const updateOption = (optionText: string, index: number) => {
    const newOptions = [...pollOptions];
    newOptions[index] = optionText;
    setPollOptions(newOptions);
  };

  const addOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const handlePost = async () => {
    if (!text.trim() && mediaItems.length === 0 && !showPoll) return;

    // Poll Validation
    if (showPoll) {
      if (!pollQuestion.trim()) {
        Alert.alert('Missing Question', 'Please ask a question for your poll.');
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim().length > 0);
      if (validOptions.length < 2) {
        Alert.alert('Insufficient Options', 'Please provide at least 2 options for your poll.');
        return;
      }
    }

    let uploadedMedia: UploadedFile[] = [];

    if (mediaItems.length > 0) {
      uploadedMedia = await uploadFiles(mediaItems);
      if (uploadedMedia.length === 0 && mediaItems.length > 0) {
        return; // Upload failed
      }
    }

    createPost({
      content: text,
      isAnonymous: identity === 'alias',
      media: uploadedMedia.map(m => ({
        type: m.type,
        url: m.url
      })),
      poll: showPoll ? {
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim().length > 0),
        durationDays: 1
      } : undefined
    }, {
      onSuccess: () => {
        router.back();
      },
      onError: (error: any) => {
        console.log('Post error:', error);
        const errorMessage = error?.response?.data?.error || error.message || 'Failed to publish post.';
        const displayMessage = Array.isArray(errorMessage)
          ? errorMessage.map((e: any) => e.message).join('\n')
          : typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage;
        Alert.alert('Error', displayMessage);
      }
    });
  };

  const isPostDisabled = (!text.trim() && mediaItems.length === 0 && !showPoll) || isPending || isUploading;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-gray-500">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePost}
          disabled={isPostDisabled}
          className={`bg-[#1990e6] px-5 py-2 rounded-full ${isPostDisabled ? 'opacity-50' : ''}`}
        >
          {isPending || isUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold">Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="p-4">
            <View className="flex-row gap-4">
              {/* User Avatar */}
              <View className="shrink-0 pt-1">
                <Image
                  source={{ uri: userAvatar }}
                  className="w-10 h-10 rounded-full bg-gray-100"
                />
              </View>

              <View className="flex-1">
                {/* Identity Switcher */}
                <TouchableOpacity
                  onPress={() => setIdentity(identity === 'real' ? 'alias' : 'real')}
                  className="flex-row items-center gap-1 mb-2"
                >
                  <Text className={`text-xs font-bold ${identity === 'alias' ? 'text-[#F59E0B]' : 'text-gray-500'}`}>
                    {identity === 'alias' ? '👤 Posting Anonymously' : `Posting as @${user?.username || 'you'}`}
                  </Text>
                  <MaterialIcons name="expand-more" size={14} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Text Input */}
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={showPoll ? "Add context to your poll..." : "What's happening on campus?"}
                  placeholderTextColor="#94A3B8"
                  multiline
                  autoFocus
                  className="text-[17px] text-[#111818] dark:text-white min-h-[100px] leading-6"
                  style={{ textAlignVertical: 'top' }}
                />

                {/* Media Previews */}
                {mediaItems.length > 0 && (
                  <View className="mb-4 mt-3">
                    <View className="flex-row justify-between items-center mb-2 px-1">
                      <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        {mediaItems.length}/10 Gallery
                      </Text>
                      {mediaItems.length > 1 && (
                        <Text className="text-[10px] text-[#1990e6] font-bold">Swipe to view all</Text>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                      {mediaItems.map((item, index) => (
                        <View key={index} className="relative mr-3">
                          <Image
                            source={{ uri: item.uri }}
                            className="w-28 h-28 rounded-2xl bg-gray-100 border border-gray-100 dark:border-gray-800 shadow-sm"
                          />
                          <TouchableOpacity
                            onPress={() => removeMedia(index)}
                            className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1.5"
                          >
                            <MaterialIcons name="close" size={14} color="white" />
                          </TouchableOpacity>
                          <View className="absolute bottom-1.5 left-1.5 bg-black/40 px-1.5 py-0.5 rounded-md">
                            <Text className="text-[9px] text-white font-bold">{index + 1}</Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Poll Creator UI */}
                {showPoll && (
                  <View className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 mb-3 bg-gray-50 dark:bg-gray-800/50 mt-3">
                    <TextInput
                      value={pollQuestion}
                      onChangeText={setPollQuestion}
                      placeholder="Ask a question..."
                      placeholderTextColor="#9CA3AF"
                      className="text-base font-bold text-[#111818] dark:text-white mb-3"
                    />
                    <View className="space-y-2">
                      {pollOptions.map((option, index) => (
                        <View key={index} className="flex-row items-center gap-2 mb-2">
                          <View className="flex-1 flex-row items-center border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900 px-3 h-10">
                            <Text className="text-gray-400 font-bold mr-2 text-xs">Option {index + 1}</Text>
                            <TextInput
                              value={option}
                              onChangeText={(optText) => updateOption(optText, index)}
                              placeholder={`Choice ${index + 1}`}
                              placeholderTextColor="#CBD5E1"
                              className="flex-1 text-sm text-[#111818] dark:text-white"
                            />
                          </View>
                          {pollOptions.length > 2 && (
                            <TouchableOpacity onPress={() => removeOption(index)}>
                              <MaterialIcons name="remove-circle-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                    {pollOptions.length < 4 && (
                      <TouchableOpacity onPress={addOption} className="mt-1 flex-row items-center justify-center py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <MaterialIcons name="add" size={16} color="#1990e6" />
                        <Text className="text-[#1990e6] text-xs font-bold ml-1">Add Option</Text>
                      </TouchableOpacity>
                    )}
                    <View className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2 flex-row justify-between items-center">
                      <Text className="text-xs text-gray-400 font-medium">Poll duration: 24h</Text>
                      <TouchableOpacity onPress={() => setShowPoll(false)}>
                        <Text className="text-xs text-red-500 font-bold">Remove Poll</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Toolbar */}
        <View className="p-4 border-t border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
          <View className="flex-row gap-5">
            <TouchableOpacity onPress={handlePickImage} disabled={isUploading || showPoll}>
              <MaterialIcons name="image" size={26} color={showPoll ? "#CBD5E1" : "#1990e6"} style={{ opacity: isUploading ? 0.5 : 1 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePoll} disabled={mediaItems.length > 0}>
              <MaterialIcons name="poll" size={26} color={mediaItems.length > 0 ? "#CBD5E1" : (showPoll ? "#111818" : "#1990e6")} />
            </TouchableOpacity>
            <TouchableOpacity>
              <MaterialIcons name="location-on" size={26} color="#1990e6" />
            </TouchableOpacity>
          </View>
          {mediaItems.length > 0 && (
            <Text className="text-xs text-gray-400 font-medium">{mediaItems.length}/10 images</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
