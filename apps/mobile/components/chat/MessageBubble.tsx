import React from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Pressable } from 'react-native';
import clsx from 'clsx';
import { MaterialIcons } from '@expo/vector-icons';
import { Message } from '@uni-social/shared-types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getSafeImageUrl } from '../../utils/images';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
  userAvatar?: string;
  onImagePress?: (imageUrl: string) => void;
  onDeletePress?: (messageId: string) => void;
}

export function MessageBubble({ message, currentUserId, userAvatar, onImagePress, onDeletePress }: MessageBubbleProps) {
  const isMe = message.senderId === currentUserId;

  const formatTime = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const safeImageUrl = getSafeImageUrl(message.imageUrl);
  
  // Determine if this is an image or document based on URL
  const isImage = safeImageUrl && (
    safeImageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
    (safeImageUrl.includes('cloudinary') && safeImageUrl.includes('/image/upload'))
  );
  
  const isDocument = safeImageUrl && !isImage;
  
  // Extract filename from URL
  const getFileName = (url: string) => {
    try {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return decodeURIComponent(filename.split('?')[0]);
    } catch (e) {
        return 'Attachment';
    }
  };
  
  // Get file extension
  const getFileExt = (url: string) => {
    const filename = getFileName(url);
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'FILE';
  };
  
  // Get file icon based on extension
  const getFileIcon = (url: string): keyof typeof MaterialIcons.glyphMap => {
    const ext = getFileExt(url)?.toLowerCase();
    if (ext === 'pdf') return 'picture-as-pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'description';
    if (['xls', 'xlsx'].includes(ext || '')) return 'table-chart';
    if (['ppt', 'pptx'].includes(ext || '')) return 'slideshow';
    return 'insert-drive-file';
  };

  const handleDownload = async () => {
    if (!safeImageUrl) return;
    
    try {
      const filename = getFileName(safeImageUrl);
      const fileUri = FileSystem.documentDirectory + filename;
      
      const downloadResult = await FileSystem.downloadAsync(safeImageUrl, fileUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const handleLongPress = () => {
    if (!isMe || !onDeletePress) return;
    
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeletePress(message.id) }
      ]
    );
  };

  return (
    <Pressable 
      onLongPress={handleLongPress}
      delayLongPress={500}
      className={clsx("flex-row items-end gap-2 mb-4", isMe ? "justify-end" : "justify-start")}
    >
      {!isMe && (
        <Image 
          source={{ uri: getSafeImageUrl(userAvatar) || 'https://ui-avatars.com/api/?name=U' }} 
          className="size-8 rounded-full mb-1 bg-gray-200"
        />
      )}
      
      <View className={clsx("max-w-[85%] flex-col gap-1", isMe ? "items-end" : "items-start")}>
        <View className={clsx(
            "px-4 py-3 shadow-sm overflow-hidden",
            isMe ? "bg-[#5eb2ed] rounded-2xl rounded-br-none" : "bg-[#f0f3f4] dark:bg-slate-700 rounded-2xl rounded-bl-none"
        )}>
            {/* Image attachment */}
            {isImage && (
                <TouchableOpacity 
                    onPress={() => onImagePress?.(safeImageUrl!)}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={{ uri: safeImageUrl }} 
                        className="w-48 h-48 rounded-lg mb-2 bg-gray-100"
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            )}
            
            {/* Document attachment */}
            {isDocument && (
                <TouchableOpacity 
                    onPress={handleDownload}
                    className={clsx(
                        "flex-row items-center gap-3 rounded-xl p-3 mb-1",
                        isMe ? "bg-white/90" : "bg-white dark:bg-black/30"
                    )}
                    style={{ minWidth: 200 }}
                >
                    <View className={clsx(
                        "size-10 rounded-full items-center justify-center", 
                        isMe ? "bg-blue-100" : "bg-gray-100 dark:bg-gray-700"
                    )}>
                        <MaterialIcons name={getFileIcon(safeImageUrl!)} size={22} color="#5eb2ed" />
                    </View>
                    <View className="flex-1">
                        <Text 
                            className="text-sm font-semibold text-gray-900 dark:text-gray-100" // Always readable on white/light bg
                            numberOfLines={1}
                        >
                            {getFileName(safeImageUrl!)}
                        </Text>
                        <Text className="text-xs text-gray-500">
                            {getFileExt(safeImageUrl!)} • Tap to download
                        </Text>
                    </View>
                    <View className="bg-gray-50 dark:bg-gray-700 p-1.5 rounded-full">
                         <MaterialIcons name="download" size={18} color="#637888" />
                    </View>
                </TouchableOpacity>
            )}
            
            {/* Text content */}
            {message.content ? (
                <Text className={clsx("text-sm leading-relaxed", isMe ? "text-white" : "text-[#111518] dark:text-white")}>
                    {message.content}
                </Text>
            ) : null}
        </View>

        <View className="flex-row items-center gap-1 mt-0.5 px-1">
           <Text className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</Text>
           {isMe && message.isRead && (
             <MaterialIcons name="done-all" size={12} color="#5eb2ed" />
           )}
        </View>
      </View>
    </Pressable>
  );
}
