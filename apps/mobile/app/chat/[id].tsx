import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { AttachmentPreviewModal, PendingAttachment } from '../../components/chat/AttachmentPreviewModal';
import { AttachmentBar } from '../../components/chat/AttachmentBar';
import { ImageViewerModal } from '../../components/chat/ImageViewerModal';
import { useChatMessages, useSendMessage, useDeleteMessage } from '../../hooks/useChat';
import { useAuthStore } from '../../store/authStore';
import { Message } from '@uni-social/shared-types';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import { getUserAvatar } from '../../utils/images';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function ChatScreen() {
  const router = useRouter();
  const { id, name, avatar, verified, department, recipientId, initialMessage } = useLocalSearchParams<{ id: string, name: string, avatar: string, verified: string, department: string, recipientId: string, initialMessage?: string }>();
  const [inputText, setInputText] = useState(initialMessage || '');
  
  // Pending attachments state
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<PendingAttachment | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  
  // Image viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState('');

  const conversationId = id as string;
  const isNewConversation = conversationId === 'new';
  const { user } = useAuthStore();
  
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading 
  } = useChatMessages(isNewConversation ? '' : conversationId);
  
  const sendMessageMutation = useSendMessage();
  const deleteMessageMutation = useDeleteMessage();
  const { pickImage, uploadFiles, isUploading } = useMediaUpload();
  const [isSending, setIsSending] = useState(false);

  // Helper to flatten pages -> messages
  const messages = data?.pages.flatMap(page => Array.isArray(page) ? page : []) || [];

  // Generate unique ID for attachments
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle sending message with all attachments
  // Handle sending message with all attachments
  const handleSend = async () => {
      if (!recipientId) return;
      
      const hasText = inputText.trim().length > 0;
      const hasAttachments = pendingAttachments.length > 0;
      
      if (!hasText && !hasAttachments) return;
      
      setIsSending(true);
      
      try {
          const uploads = [];

          // Upload all attachments first
          if (hasAttachments) {
              for (const attachment of pendingAttachments) {
                  const fakeAsset = {
                      uri: attachment.uri,
                      fileName: attachment.name,
                      mimeType: attachment.mimeType,
                  } as ImagePicker.ImagePickerAsset;
                  
                  const uploadedFiles = await uploadFiles([fakeAsset]);
                  if (uploadedFiles.length > 0) {
                      uploads.push(uploadedFiles[0]);
                  }
              }
          }
          
          if (uploads.length > 0) {
              // Send each attachment as a message
              // If there is text, combine it with the LAST attachment
              // Or if multiple attachments, send text with first? 
              // User request: "dont treat them as seperate texts, its one"
              
              // Strategy: 
              // 1. If 1 attachment + text -> Send 1 message with imageUrl + content
              // 2. If >1 attachment + text -> Send N-1 attachments as image-only, then last one with text? 
              //    OR Send text with first one?
              //    Let's send text with the FIRST attachment.
              
              for (let i = 0; i < uploads.length; i++) {
                  const upload = uploads[i];
                  const isFirst = i === 0;
                  const contentToSend = (isFirst && hasText) ? inputText.trim() : '';

                  // If we sent text with first attachment, we don't send it again
                  
                  await new Promise<void>((resolve, reject) => {
                      sendMessageMutation.mutate({
                          recipientId: recipientId,
                          content: contentToSend,
                          imageUrl: upload.url
                      }, {
                          onSuccess: (data: any) => {
                              if (isNewConversation && data?.data?.conversationId && i === 0) {
                                  router.setParams({ id: data.data.conversationId });
                              }
                              resolve();
                          },
                          onError: (e) => reject(e)
                      });
                  });
              }
              
              // If there was text but we somehow didn't send it (e.g. no uploads succeeded?), handle fallback
              // But here we iterate uploads. 
              
          } else if (hasText) {
              // Only text
              await new Promise<void>((resolve, reject) => {
                  sendMessageMutation.mutate({
                      recipientId: recipientId,
                      content: inputText.trim()
                  }, {
                      onSuccess: (data: any) => {
                          if (isNewConversation && data?.data?.conversationId) {
                              router.setParams({ id: data.data.conversationId });
                          }
                          resolve();
                      },
                      onError: (e) => reject(e)
                  });
              });
          }
          
          // Clear state
          setInputText('');
          setPendingAttachments([]);
          
      } catch (error) {
          console.error('Send error:', error);
          Alert.alert('Error', 'Failed to send message. Please try again.');
      } finally {
          setIsSending(false);
      }
  };

  // Handle picking image from gallery (with preview)
  const handlePickImage = async () => {
      const assets = await pickImage();
      if (assets && assets.length > 0) {
          // Show preview for first image
          const asset = assets[0];
          const attachment: PendingAttachment = {
              id: generateId(),
              uri: asset.uri,
              name: asset.fileName || 'image.jpg',
              type: 'image',
              mimeType: asset.mimeType || 'image/jpeg',
              size: asset.fileSize
          };
          setPreviewAttachment(attachment);
          setIsPreviewModalVisible(true);
      }
  };

  // Handle taking photo with camera (with preview)
  const handleTakePhoto = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take photos.');
          return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const attachment: PendingAttachment = {
              id: generateId(),
              uri: asset.uri,
              name: asset.fileName || 'photo.jpg',
              type: 'image',
              mimeType: asset.mimeType || 'image/jpeg',
              size: asset.fileSize
          };
          setPreviewAttachment(attachment);
          setIsPreviewModalVisible(true);
      }
  };

  // Handle picking document (with preview)
  const handlePickDocument = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({
              type: '*/*',
              copyToCacheDirectory: true
          });
          
          if (!result.canceled && result.assets && result.assets.length > 0) {
              const doc = result.assets[0];
              const attachment: PendingAttachment = {
                  id: generateId(),
                  uri: doc.uri,
                  name: doc.name,
                  type: 'document',
                  mimeType: doc.mimeType || 'application/octet-stream',
                  size: doc.size
              };
              setPreviewAttachment(attachment);
              setIsPreviewModalVisible(true);
          }
      } catch (error) {
          console.error('Document picker error:', error);
      }
  };

  // Handle confirming attachment from preview modal
  const handleConfirmAttachment = (attachment: PendingAttachment) => {
      setPendingAttachments(prev => [...prev, attachment]);
      setIsPreviewModalVisible(false);
      setPreviewAttachment(null);
  };

  // Handle removing pending attachment
  const handleRemoveAttachment = (id: string) => {
      setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Show attachment options
  const handleAddMore = () => {
      Alert.alert(
          'Attach',
          'Choose an option',
          [
              { text: 'Photo Gallery', onPress: handlePickImage },
              { text: 'Take Photo', onPress: handleTakePhoto },
              { text: 'Document', onPress: handlePickDocument },
              { text: 'Cancel', style: 'cancel' }
          ]
      );
  };

  const handleCall = () => {
      Alert.alert('Audio Call', 'Audio calling is currently in development.');
  };

  const renderItem = ({ item }: { item: Message }) => (
      <MessageBubble 
          message={item} 
          currentUserId={user?.id}
          userAvatar={getUserAvatar(avatar, name)}
          onImagePress={(url) => {
              setViewerImage(url);
              setViewerVisible(true);
          }}
          onDeletePress={(messageId) => {
              deleteMessageMutation.mutate(messageId);
          }}
      />
  );

  const canSend = inputText.trim().length > 0 || pendingAttachments.length > 0;
  const isBusy = isSending || isUploading || sendMessageMutation.isPending;

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 z-50">
         <View className="px-4 py-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
               <TouchableOpacity onPress={() => router.back()} className="size-8 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-slate-800">
                  <MaterialIcons name="chevron-left" size={28} color="#111518" />
               </TouchableOpacity>
               <View className="flex-row items-center gap-3">
                  <Image source={{ uri: getUserAvatar(avatar, name) }} className="size-10 rounded-full border-2 border-[#5eb2ed]/20" />
                  <View>
                     <View className="flex-row items-center gap-1">
                        <Text className="text-[#111518] dark:text-white text-[15px] font-bold">{name}</Text>
                        {verified === 'true' && <MaterialIcons name="verified-user" size={14} color="#5eb2ed" />}
                     </View>
                     {department ? (
                         <Text className="text-[#637888] dark:text-gray-400 text-[11px] font-medium uppercase tracking-wider">{department}</Text>
                     ) : (
                         <Text className="text-[#637888] dark:text-gray-400 text-[11px] font-medium uppercase tracking-wider">Student</Text>
                     )}
                  </View>
               </View>
            </View>
            <View className="flex-row gap-1">
               <TouchableOpacity onPress={handleCall} className="size-10 items-center justify-center">
                  <MaterialIcons name="call" size={24} color="#111518" />
               </TouchableOpacity>
            </View>
         </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        className="flex-1"
      >
         <FlatList
             data={messages}
             renderItem={renderItem}
             keyExtractor={item => item.id}
             inverted
             contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
             onEndReached={() => {
                 if (hasNextPage && !isFetchingNextPage) fetchNextPage();
             }}
             ListFooterComponent={
                 <View className="items-center py-6 opacity-40">
                    <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 mb-2">
                       <MaterialIcons name="lock" size={12} color="#637888" />
                       <Text className="text-[10px] text-[#637888] dark:text-gray-400 font-medium uppercase tracking-wide">End-to-end encrypted</Text>
                    </View>
                 </View>
             }
             ListEmptyComponent={
                 !isLoading ? (
                    <View className="items-center justify-center py-20 opacity-50">
                        <Text className="text-gray-400">No messages yet</Text>
                    </View>
                 ) : null
             }
         />
 
         {/* Attachment Bar */}
         <AttachmentBar 
             attachments={pendingAttachments}
             onRemove={handleRemoveAttachment}
             onAddMore={handleAddMore}
         />

         {/* Composer */}
         <View className="bg-white dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-slate-800 px-4 pt-3 pb-8">
            <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                   onPress={handleAddMore}
                   className="size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800"
                >
                   <MaterialIcons name="add-circle-outline" size={24} color="#637888" />
                </TouchableOpacity>
               
               <View className="flex-1 relative">
                  <View className="flex-row items-center min-h-[44px] bg-[#f0f3f4] dark:bg-slate-800 rounded-full px-4 border border-transparent focus-within:border-[#5eb2ed]/30">
                     <TextInput 
                        className="flex-1 text-[#111518] dark:text-white py-2 text-sm"
                        placeholder="Message securely..."
                        placeholderTextColor="#637888"
                        value={inputText}
                        onChangeText={setInputText}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        editable={!isBusy}
                     />
                     <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={handlePickImage} disabled={isBusy}>
                           {isUploading ? (
                               <ActivityIndicator size="small" color="#94A3B8" />
                           ) : (
                               <MaterialIcons name="image" size={20} color="#94A3B8" />
                           )}
                        </TouchableOpacity>
                     </View>
                  </View>
               </View>

               <TouchableOpacity 
                   onPress={handleSend}
                   disabled={!canSend || isBusy}
                   className={`size-11 items-center justify-center rounded-full shadow-lg shadow-blue-500/20 active:scale-95 ${!canSend ? 'bg-gray-300' : 'bg-[#5eb2ed]'}`}
                >
                  {isBusy ? (
                      <ActivityIndicator size="small" color="white" />
                  ) : (
                      <MaterialIcons name="send" size={20} color="white" />
                  )}
               </TouchableOpacity>
            </View>
         </View>
      </KeyboardAvoidingView>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
          visible={isPreviewModalVisible}
          attachment={previewAttachment}
          onConfirm={handleConfirmAttachment}
          onCancel={() => {
              setIsPreviewModalVisible(false);
              setPreviewAttachment(null);
          }}
      />

      <ImageViewerModal 
        visible={viewerVisible}
        imageUrl={viewerImage}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
