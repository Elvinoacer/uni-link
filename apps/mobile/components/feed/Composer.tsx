import React, { useState } from 'react';
import { View, Text, TextInput, Image, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useCreatePost } from '../../hooks/usePosts';
import { useMediaUpload, UploadedFile } from '../../hooks/useMediaUpload';
import { useAuthStore } from '../../store/authStore';
import { getUserAvatar } from '../../utils/images';

export function Composer() {
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

  const updateOption = (text: string, index: number) => {
      const newOptions = [...pollOptions];
      newOptions[index] = text;
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
              return;
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
              setText('');
              setMediaItems([]);
              setShowPoll(false);
              setPollQuestion('');
              setPollOptions(['', '']);
              Alert.alert('Success', 'Your post is live!');
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

  const hasContent = text.trim() || mediaItems.length > 0 || showPoll;

  return (
    <View className="mx-4 my-3 bg-white dark:bg-[#1a2332] rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm overflow-hidden">
      {/* Main Composer */}
      <View className="p-4">
        <View className="flex-row gap-3">
          {/* Avatar with Gradient Ring */}
          <View>
            <LinearGradient
              colors={identity === 'alias' ? ['#F59E0B', '#EF4444'] : ['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-11 h-11 rounded-full p-[2px]"
            >
              {identity === 'alias' ? (
                <View className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 items-center justify-center border-2 border-white dark:border-[#1a2332]">
                  <MaterialIcons name="masks" size={20} color="#F59E0B" />
                </View>
              ) : (
                <Image 
                  source={{ uri: userAvatar }} 
                  className="w-full h-full rounded-full border-2 border-white dark:border-[#1a2332]"
                />
              )}
            </LinearGradient>
          </View>

          <View className="flex-1">
            {/* Identity Toggle - Pill Style */}
            <TouchableOpacity 
                onPress={() => setIdentity(identity === 'real' ? 'alias' : 'real')}
                className={`self-start flex-row items-center gap-1.5 px-3 py-1.5 rounded-full mb-2 ${
                  identity === 'alias' 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' 
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
            >
                <MaterialIcons 
                  name={identity === 'alias' ? 'masks' : 'public'} 
                  size={12} 
                  color={identity === 'alias' ? '#F59E0B' : '#6B7280'} 
                />
                <Text className={`text-[11px] font-bold ${identity === 'alias' ? 'text-amber-600' : 'text-gray-500'}`}>
                    {identity === 'alias' ? 'Anonymous' : 'Public'}
                </Text>
                <MaterialIcons name="swap-vert" size={12} color="#9CA3AF" />
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={showPoll ? "Add context to your poll..." : "Share something with the campus..."}
              placeholderTextColor="#9CA3AF"
              multiline
              className="text-[16px] text-gray-900 dark:text-white min-h-[50px] leading-6"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        </View>
        
        {/* Media Previews - Premium Grid */}
        {mediaItems.length > 0 && (
          <Animated.View 
            entering={FadeInDown.duration(300)}
            className="mt-4"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-1 h-4 rounded-full bg-indigo-500" />
                <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {mediaItems.length}/10 Media
                </Text>
              </View>
              {mediaItems.length > 1 && (
                <Text className="text-[10px] text-indigo-500 font-bold">Swipe to view</Text>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mediaItems.map((item, index) => (
                <Animated.View 
                  key={index} 
                  entering={FadeIn.delay(index * 50)}
                  className="relative mr-2"
                >
                  <Image 
                    source={{ uri: item.uri }} 
                    className="w-24 h-24 rounded-xl bg-gray-100" 
                  />
                  <TouchableOpacity 
                    onPress={() => removeMedia(index)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 items-center justify-center"
                  >
                    <MaterialIcons name="close" size={14} color="white" />
                  </TouchableOpacity>
                  <View className="absolute bottom-1.5 left-1.5 bg-black/50 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] text-white font-bold">{index + 1}</Text>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Poll Creator - Premium Card */}
        {showPoll && (
          <Animated.View 
            entering={FadeInDown.duration(300)}
            className="mt-4 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10"
          >
            <View className="flex-row items-center gap-2 mb-3">
              <MaterialIcons name="poll" size={16} color="#6366F1" />
              <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Create Poll</Text>
            </View>
            
            <TextInput
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Ask a question..."
              placeholderTextColor="#9CA3AF"
              className="text-base font-semibold text-gray-900 dark:text-white mb-3 bg-white dark:bg-gray-800 p-3 rounded-lg"
            />
            
            <View className="gap-2">
              {pollOptions.map((option, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <View className="flex-1 flex-row items-center bg-white dark:bg-gray-800 rounded-lg px-3 h-11 border border-gray-200 dark:border-gray-700">
                    <View className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mr-2">
                      <Text className="text-indigo-600 text-[10px] font-bold">{index + 1}</Text>
                    </View>
                    <TextInput
                      value={option}
                      onChangeText={(text) => updateOption(text, index)}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#CBD5E1"
                      className="flex-1 text-sm text-gray-900 dark:text-white"
                    />
                  </View>
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removeOption(index)} className="p-1">
                      <MaterialIcons name="remove-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            
            {pollOptions.length < 4 && (
              <TouchableOpacity 
                onPress={addOption} 
                className="mt-3 flex-row items-center justify-center py-2.5 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg bg-white/50 dark:bg-gray-800/50"
              >
                <MaterialIcons name="add" size={16} color="#6366F1" />
                <Text className="text-indigo-600 text-xs font-bold ml-1">Add Option</Text>
              </TouchableOpacity>
            )}
            
            <View className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/30 flex-row justify-between items-center">
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons name="schedule" size={14} color="#9CA3AF" />
                <Text className="text-xs text-gray-400 font-medium">Expires in 24h</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPoll(false)}>
                <Text className="text-xs text-red-500 font-bold">Remove Poll</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Action Bar - Sleek Design */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30">
        <View className="flex-row gap-1">
          <TouchableOpacity 
            onPress={handlePickImage} 
            disabled={isUploading || showPoll}
            className={`w-10 h-10 rounded-full items-center justify-center ${showPoll ? 'opacity-40' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}
          >
            <MaterialIcons name="image" size={22} color={showPoll ? "#CBD5E1" : "#6366F1"} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={togglePoll} 
            disabled={mediaItems.length > 0}
            className={`w-10 h-10 rounded-full items-center justify-center ${mediaItems.length > 0 ? 'opacity-40' : showPoll ? 'bg-indigo-500' : 'bg-purple-50 dark:bg-purple-900/20'}`}
          >
            <MaterialIcons name="poll" size={22} color={mediaItems.length > 0 ? "#CBD5E1" : showPoll ? "#FFF" : "#8B5CF6"} />
          </TouchableOpacity>
        </View>
         
        <TouchableOpacity 
          onPress={handlePost}
          disabled={!hasContent || isPending || isUploading}
          className="overflow-hidden rounded-full"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={hasContent && !isPending && !isUploading ? ['#6366F1', '#8B5CF6'] : ['#D1D5DB', '#E5E7EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-6 py-2.5 flex-row items-center gap-2"
          >
            {isPending || isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text className={`font-bold text-[13px] ${hasContent ? 'text-white' : 'text-gray-400'}`}>Post</Text>
                <MaterialIcons name="send" size={14} color={hasContent ? "#FFF" : "#9CA3AF"} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
