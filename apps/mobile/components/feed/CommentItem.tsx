import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import clsx from 'clsx';
import { MaterialIcons } from '@expo/vector-icons';
import { useLikePost } from '../../hooks/usePosts';

export interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    isVerified?: boolean;
    isAnonymous?: boolean;
    badge?: string;
  };
  content: string;
  createdAt: string;
  likesCount?: number;
  hasLiked?: boolean;
  replies?: Comment[];
  replyingToName?: string; // Name of user being replied to
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onReply?: (commentId: string, authorName: string) => void;
  maxVisibleReplies?: number;
}

export function CommentItem({ comment, isReply = false, onReply, maxVisibleReplies = 2 }: CommentItemProps) {
  const { mutate: likeComment } = useLikePost();
  const [isLiked, setIsLiked] = useState(comment.hasLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const handleLike = () => {
    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
    
    // Call API (comments are just posts, use same endpoint)
    likeComment({ id: comment.id });
  };

  const visibleReplies = showAllReplies 
    ? comment.replies 
    : comment.replies?.slice(0, maxVisibleReplies);
  
  const hiddenRepliesCount = (comment.replies?.length || 0) - maxVisibleReplies;

  return (
    <View className="relative">
      <View className="flex-row gap-3">
        {/* Connector Line for Replies */}
        {isReply && (
           <View className="absolute left-[-22px] top-4 w-4 h-[2px] bg-slate-200 dark:bg-slate-800" />
        )}

        <Image 
          source={comment.author.avatar} 
          style={{ width: isReply ? 32 : 36, height: isReply ? 32 : 36, borderRadius: isReply ? 16 : 18 }}
          contentFit="cover"
          className="bg-gray-200 border border-slate-200 dark:border-slate-700"
        />
        
        <View className="flex-1">
          <View className="bg-slate-100 dark:bg-[#1e2124] p-3 rounded-2xl rounded-tl-none self-start">
            {/* Reply Indicator */}
            {comment.replyingToName && (
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="reply" size={12} color="#3B82F6" />
                <Text className="text-[11px] text-blue-500 ml-1">
                  Replying to <Text className="font-semibold">@{comment.replyingToName}</Text>
                </Text>
              </View>
            )}
            
            <View className="flex-row items-center gap-2 mb-1">
              <Text className={clsx("text-sm font-bold dark:text-white", comment.author.isAnonymous && "italic")}>
                {comment.author.name}
              </Text>
              {comment.author.isVerified && (
                <MaterialIcons name="verified" size={12} color="#1990e6" />
              )}
              {comment.author.badge && (
                <View className="px-1 bg-slate-200 dark:bg-slate-700 rounded">
                   <Text className="text-[10px] text-slate-500">{comment.author.badge}</Text>
                </View>
              )}
              <Text className="text-[10px] text-slate-500">• {comment.createdAt}</Text>
            </View>
            <Text className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {comment.content}
            </Text>
          </View>
          
          {/* Actions Row */}
          <View className="flex-row items-center gap-4 mt-2 ml-1">
            <TouchableOpacity 
              onPress={handleLike}
              className="flex-row items-center gap-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons 
                name={isLiked ? "favorite" : "favorite-border"} 
                size={14} 
                color={isLiked ? "#EF4444" : "#64748B"} 
              />
              <Text className={clsx("text-[11px] font-bold", isLiked ? "text-red-500" : "text-slate-500")}>
                {likesCount > 0 ? likesCount : 'Like'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => onReply?.(comment.id, comment.author.name)}
              className="flex-row items-center gap-1"
            >
              <MaterialIcons name="chat-bubble-outline" size={14} color="#64748B" />
              <Text className="text-[11px] font-bold text-slate-500">
                Reply{comment.replies && comment.replies.length > 0 ? ` (${comment.replies.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nested Replies - Expandable */}
          {visibleReplies && visibleReplies.length > 0 && (
             <View className="mt-4 space-y-4 relative">
                {/* Vertical Line */}
                <View className="absolute left-[-22px] top-[-30px] bottom-4 w-[2px] bg-slate-200 dark:bg-slate-800 rounded-full" />
                {visibleReplies.map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    isReply 
                    onReply={onReply}
                    maxVisibleReplies={maxVisibleReplies}
                  />
                ))}
                
                {/* View More Replies Button */}
                {!showAllReplies && hiddenRepliesCount > 0 && (
                  <TouchableOpacity 
                    onPress={() => setShowAllReplies(true)}
                    className="flex-row items-center gap-1 mt-2 ml-2"
                  >
                    <MaterialIcons name="subdirectory-arrow-right" size={14} color="#3B82F6" />
                    <Text className="text-[12px] font-semibold text-blue-500">
                      View {hiddenRepliesCount} more {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
                    </Text>
                  </TouchableOpacity>
                )}
             </View>
          )}
        </View>
      </View>
    </View>
  );
}
