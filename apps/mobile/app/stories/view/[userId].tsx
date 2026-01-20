import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, ScrollView, Modal, Share, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStoriesFeed, useMyStories, useViewStory, useLikeStory, useUnlikeStory, useStoryEngagement, Story } from '../../../hooks/useStories';
import { useSendMessage } from '../../../hooks/useChat';
import { useAuthStore } from '../../../store/authStore';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { user: currentUser } = useAuthStore();
  const { data: feed } = useStoriesFeed();
  const { data: myStories } = useMyStories();
  const { mutate: viewStory } = useViewStory();
  const { mutate: likeStory } = useLikeStory();
  const { mutate: unlikeStory } = useUnlikeStory();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showEngagement, setShowEngagement] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Helper to get initials
  const getInitials = (name: string | null | undefined, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  // Combine my stories and feed into one list for navigation
  const allStoryGroups = React.useMemo(() => {
     let groups = feed || [];
     if (myStories && myStories.length > 0) {
        const myGroup = {
            user: currentUser!,
            stories: myStories as Story[],
            allViewed: false 
        };
        if (!groups.find(g => g.user.id === currentUser?.id)) {
            groups = [myGroup, ...groups];
        } else {
            groups = groups.map(g => g.user.id === currentUser?.id ? myGroup : g);
        }
     }
     return groups;
  }, [feed, myStories, currentUser]);

  // Find initial index based on userId param
  useEffect(() => {
     if (allStoryGroups.length > 0 && userId) {
        const index = allStoryGroups.findIndex(g => g.user.id === userId);
        if (index !== -1) setCurrentUserIndex(index);
     }
  }, [userId, allStoryGroups.length]);

  const currentGroup = allStoryGroups[currentUserIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isOwnStory = currentGroup?.user.id === currentUser?.id;

  // Engagement data (only for own stories)
  const { data: engagement } = useStoryEngagement(isOwnStory ? currentStory?.id : null);

  // Mark viewed
  useEffect(() => {
     if (currentStory && !currentStory.isViewed && currentStory.userId !== currentUser?.id) {
        viewStory(currentStory.id);
     }
  }, [currentStory?.id]);

  // Use ref to track if we need to advance (avoids setState during render)
  const shouldAdvanceRef = React.useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = React.useRef<any>(null);

  // Handle advancing after progress completes (outside render)
  useEffect(() => {
     if (shouldAdvanceRef.current) {
        shouldAdvanceRef.current = false;
        handleNext();
     }
  }, [progress]);

  // Progress timer
  useEffect(() => {
     setProgress(0);
     if (!currentStory) return;

     const duration = 5000;
     const interval = 50;
     const steps = duration / interval;
     
     timerRef.current = setInterval(() => {
        if (!isPaused && !showEngagement && !showReply) {
           setProgress(p => {
              if (p >= 1) {
                 if (timerRef.current) clearInterval(timerRef.current);
                 shouldAdvanceRef.current = true;
                 return 1; // Keep at 1, useEffect will handle advance
              }
              return p + (1 / steps);
           });
        }
     }, interval);

     return () => {
        if (timerRef.current) clearInterval(timerRef.current);
     };
  }, [currentStory?.id, currentGroup?.user.id, isPaused, showEngagement, showReply]);

  const handleNext = () => {
     if (currentStoryIndex < (currentGroup?.stories.length || 0) - 1) {
        setCurrentStoryIndex(prev => prev + 1);
     } else {
        if (currentUserIndex < allStoryGroups.length - 1) {
           setCurrentUserIndex(prev => prev + 1);
           setCurrentStoryIndex(0);
        } else {
           router.back();
        }
     }
  };

  const handlePrev = () => {
     if (currentStoryIndex > 0) {
        setCurrentStoryIndex(prev => prev - 1);
     } else {
        if (currentUserIndex > 0) {
           setCurrentUserIndex(prev => prev - 1);
           setCurrentStoryIndex(0); 
        } else {
           router.back();
        }
     }
  };

  // Track if user was holding (to prevent onPress from firing after hold)
  const holdStartTimeRef = React.useRef<number>(0);
  const wasHoldingRef = React.useRef(false);

  const handlePressIn = () => {
      holdStartTimeRef.current = Date.now();
      setIsPaused(true);
  };

  const handlePressOut = () => {
      const holdDuration = Date.now() - holdStartTimeRef.current;
      wasHoldingRef.current = holdDuration > 200; // Consider it a hold if > 200ms
      setIsPaused(false);
  };

  const handleTapPrev = () => {
      if (wasHoldingRef.current) {
          wasHoldingRef.current = false;
          return; // Skip navigation if was holding
      }
      handlePrev();
  };

  const handleTapNext = () => {
      if (wasHoldingRef.current) {
          wasHoldingRef.current = false;
          return; // Skip navigation if was holding
      }
      handleNext();
  };

  const handleForward = async () => {
      if (!currentStory) return;
      try {
          const message = currentStory.caption 
              ? `Check out this story: "${currentStory.caption}" by ${currentGroup.user.displayName || currentGroup.user.username}`
              : `Check out this story by ${currentGroup.user.displayName || currentGroup.user.username}`;
          
          await Share.share({
              message,
              url: currentStory.mediaUrl,
          });
      } catch (error) {
          console.error('Share error:', error);
      }
  };

  const handleLikeToggle = () => {
      if (!currentStory) return;
      if (currentStory.isLiked) {
          unlikeStory(currentStory.id);
      } else {
          likeStory(currentStory.id);
      }
  };

  const handleSendReply = () => {
      if (!replyText.trim() || !currentGroup) return;
      
      sendMessage({
          recipientId: currentGroup.user.id,
          content: `📸 Replied to your story: "${replyText.trim()}"`,
      }, {
          onSuccess: () => {
              Alert.alert('Sent!', 'Your reply was sent.');
              setReplyText('');
              setShowReply(false);
          },
          onError: () => {
              Alert.alert('Error', 'Failed to send reply.');
          }
      });
  };

  // Render avatar with initials fallback
  const renderAvatar = (avatarUrl: string | null | undefined, displayName: string | null | undefined, username: string, size: number = 40) => {
      if (avatarUrl) {
          return (
              <Image 
                  source={{ uri: avatarUrl }}
                  style={{ width: size, height: size, borderRadius: size / 2 }}
                  className="border border-white/20"
              />
          );
      }
      return (
          <View 
              style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#6366f1' }}
              className="items-center justify-center border border-white/20"
          >
              <Text className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
                  {getInitials(displayName, username)}
              </Text>
          </View>
      );
  };

  if (!currentGroup || !currentStory) return <View className="flex-1 bg-black" />;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Media */}
      <Image 
        source={{ uri: currentStory.mediaUrl }} 
        className="w-full h-full absolute"
        resizeMode="contain"
      />

      <SafeAreaView className="flex-1 justify-between">
         {/* Header */}
         <View className="pt-2 px-2">
            {/* Progress Bars */}
            <View className="flex-row gap-1 mb-2">
               {currentGroup.stories.map((story, idx) => (
                  <View key={story.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                     {idx < currentStoryIndex ? (
                        <View className="flex-1 bg-white" />
                     ) : idx === currentStoryIndex ? (
                        <View style={{ width: `${progress * 100}%` }} className="h-full bg-white" />
                     ) : null}
                  </View>
               ))}
            </View>

            {/* User Info */}
            <View className="flex-row items-center justify-between">
               <View className="flex-row items-center gap-2">
                   {renderAvatar(currentGroup.user.avatarUrl, currentGroup.user.displayName, currentGroup.user.username, 32)}
                  <Text className="text-white font-bold text-sm shadow-md">
                    {currentGroup.user.displayName || currentGroup.user.username}
                  </Text>
                  <Text className="text-white/70 text-xs shadow-md">
                     {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
               </View>
               <TouchableOpacity onPress={() => router.back()} className="p-2">
                  <MaterialIcons name="close" size={24} color="white" />
               </TouchableOpacity>
            </View>
         </View>

         {/* Navigation Touch Areas */}
         <View className="absolute inset-x-0 inset-y-0 flex-row mt-20 mb-20">
            <TouchableOpacity 
               className="flex-1" 
               onPress={handleTapPrev}
               onPressIn={handlePressIn}
               onPressOut={handlePressOut}
            />
            <TouchableOpacity 
               className="flex-[2]" 
               onPress={handleTapNext} 
               onPressIn={handlePressIn}
               onPressOut={handlePressOut}
               activeOpacity={1} 
            />
         </View>

         {/* Footer */}
         <View className="mb-4">
             {currentStory.caption && (
                 <View className="px-4 mb-4">
                    <Text className="text-white text-center text-lg font-medium drop-shadow-md shadow-black">
                        {currentStory.caption}
                    </Text>
                 </View>
             )}

             <View className="px-4 flex-row items-center gap-3">
                {isOwnStory ? (
                    <TouchableOpacity 
                        onPress={() => setShowEngagement(true)}
                        className="flex-1 bg-black/30 backdrop-blur-sm py-3 px-4 rounded-2xl flex-row items-center justify-between"
                    >
                       <View className="flex-row items-center gap-2">
                          <MaterialIcons name="visibility" size={18} color="white" />
                          <Text className="text-white font-semibold">{currentStory.viewCount || 0}</Text>
                       </View>
                       <View className="w-[1px] h-4 bg-white/30" />
                       <View className="flex-row items-center gap-2">
                          <MaterialIcons name="favorite" size={18} color="#ef4444" />
                          <Text className="text-white font-semibold">{currentStory.likeCount || 0}</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={20} color="white" />
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity 
                            onPress={() => setShowReply(true)}
                            className="flex-1 h-11 rounded-full bg-white/10 border border-white/20 px-4 flex-row items-center"
                        >
                           <Text className="text-white/60 flex-1">Reply to {currentGroup.user.displayName || currentGroup.user.username}...</Text>
                           <MaterialIcons name="chat-bubble-outline" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLikeToggle} className="p-2">
                           <MaterialIcons 
                               name={currentStory.isLiked ? "favorite" : "favorite-border"} 
                               size={26} 
                               color={currentStory.isLiked ? "#ef4444" : "white"} 
                           />
                        </TouchableOpacity>
                    </>
                )}
                
                <TouchableOpacity onPress={handleForward} className="p-2">
                   <MaterialIcons name="shortcut" size={26} color="white" />
                </TouchableOpacity>
             </View>
          </View>
      </SafeAreaView>

      {/* Engagement Modal (for own stories) */}
      <Modal visible={showEngagement} animationType="slide" transparent>
          <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white dark:bg-[#1e2124] rounded-t-3xl max-h-[70%]">
                  <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <Text className="text-lg font-bold text-gray-900 dark:text-white">Story Activity</Text>
                      <TouchableOpacity onPress={() => setShowEngagement(false)}>
                          <MaterialIcons name="close" size={24} color="#666" />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView className="p-4">
                      {/* Viewers */}
                      <Text className="text-sm font-semibold text-gray-500 mb-2">
                          VIEWERS ({engagement?.viewers.length || 0})
                      </Text>
                      {engagement?.viewers.map(viewer => (
                          <View key={viewer.id} className="flex-row items-center gap-3 mb-3">
                              {renderAvatar(viewer.avatarUrl, viewer.displayName, viewer.username)}
                              <Text className="text-gray-900 dark:text-white font-medium">
                                  {viewer.displayName || viewer.username}
                              </Text>
                          </View>
                      ))}
                      
                      {/* Likers */}
                      {(engagement?.likers.length || 0) > 0 && (
                          <>
                              <Text className="text-sm font-semibold text-gray-500 mt-4 mb-2">
                                  LIKES ({engagement?.likers.length || 0})
                              </Text>
                              {engagement?.likers.map(liker => (
                                  <View key={liker.id} className="flex-row items-center gap-3 mb-3">
                                      {renderAvatar(liker.avatarUrl, liker.displayName, liker.username)}
                                      <Text className="text-gray-900 dark:text-white font-medium flex-1">
                                          {liker.displayName || liker.username}
                                      </Text>
                                      <MaterialIcons name="favorite" size={16} color="#ef4444" />
                                  </View>
                              ))}
                          </>
                      )}
                      
                      {(!engagement?.viewers.length && !engagement?.likers.length) && (
                          <Text className="text-gray-500 text-center py-8">No activity yet</Text>
                      )}
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* Reply Modal */}
      <Modal visible={showReply} animationType="slide" transparent>
          <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1 bg-black/50 justify-end"
          >
              <View className="bg-white dark:bg-[#1e2124] rounded-t-3xl p-4">
                  <View className="flex-row items-center justify-between mb-4">
                      <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          Reply to {currentGroup?.user.displayName || currentGroup?.user.username}
                      </Text>
                      <TouchableOpacity onPress={() => setShowReply(false)}>
                          <MaterialIcons name="close" size={24} color="#666" />
                      </TouchableOpacity>
                  </View>
                  
                  <View className="flex-row items-center gap-3 mb-4">
                      {currentGroup && renderAvatar(currentGroup.user.avatarUrl, currentGroup.user.displayName, currentGroup.user.username, 48)}
                      <View className="flex-1">
                          <TextInput
                              placeholder="Write your reply..."
                              placeholderTextColor="#999"
                              value={replyText}
                              onChangeText={setReplyText}
                              multiline
                              className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white max-h-32"
                              autoFocus
                          />
                      </View>
                  </View>
                  
                  <TouchableOpacity 
                      onPress={handleSendReply}
                      disabled={!replyText.trim() || isSending}
                      className={`py-3 rounded-xl items-center ${replyText.trim() && !isSending ? 'bg-[#1990e6]' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                      <Text className={`font-semibold ${replyText.trim() && !isSending ? 'text-white' : 'text-gray-500'}`}>
                          {isSending ? 'Sending...' : 'Send Reply'}
                      </Text>
                  </TouchableOpacity>
              </View>
          </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
