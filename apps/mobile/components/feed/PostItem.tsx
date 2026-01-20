import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Share, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import clsx from 'clsx';
import { useLikePost, useRepostPost, usePollVote, useDeletePost } from '../../hooks/usePosts';
import { usePinPost } from '../../hooks/useProfile';
import { useAuthStore } from '../../store/authStore';
import { ModerationService } from '../../services/moderation.service';
import { PostOptionsModal, ReportModal, OptionItem } from './PostOptionsModal';
import { Poll as PollView } from './Poll';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  order: number;
}

export interface Poll {
  id: string;
  question: string;
  expiresAt: string;
  options: PollOption[];
  hasVoted?: boolean;
  userVotedOptionId?: string;
  totalVotes: number;
}

export interface Post {
  id: string;
  authorId?: string;
  author: {
    id?: string;
    name: string;
    handle?: string;
    avatar: string;
    isVerified?: boolean;
    isAnonymous?: boolean;
  };
  content: string;
  image?: string;
  images?: string[];
  createdAt: string;
  stats: {
    comments: number;
    reposts: number;
    likes: number;
    views?: number;
  };
  hasLiked?: boolean;
  hasReposted?: boolean;
  isPinned?: boolean;
  type?: 'standard' | 'anonymous' | 'event';
  replies?: Post[];
  poll?: Poll;
  // Community post fields
  postType?: 'user' | 'community';
  community?: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  originalId?: string; // Original ID for community posts (without prefix)
  communityId?: string; // Community ID for navigation
}

interface PostItemProps {
  post: Post;
  onPress?: () => void;
}

function LikeButton({ post }: { post: Post }) {
    const { mutate: likePost } = useLikePost();
    
    return (
        <TouchableOpacity 
            className="flex-row items-center gap-2 group p-2"
            onPress={(e) => {
                e.stopPropagation();
                likePost({ 
                    id: post.id, 
                    isCommunity: post.postType === 'community',
                    originalId: post.originalId
                });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
        >
            <View className="w-9 h-9 rounded-full items-center justify-center">
                <MaterialIcons 
                    name={post.hasLiked ? "favorite" : "favorite-border"} 
                    size={20} 
                    color={post.hasLiked ? "#EF4444" : "#64748B"} 
                />
            </View>
            <Text className={clsx("text-[13px] font-medium", post.hasLiked ? "text-red-500" : "text-gray-500")}>
                {post.stats.likes > 0 ? post.stats.likes : ''}
            </Text>
        </TouchableOpacity>
    );
}

function RepostButton({ post }: { post: Post }) {
    const { mutate: repost } = useRepostPost();
    const hasReposted = post.hasReposted;
    
    // Community posts don't support reposting yet
    if (post.postType === 'community') return null;
    
    return (
        <TouchableOpacity 
            className="flex-row items-center gap-2 group p-2"
            onPress={(e) => {
                e.stopPropagation();
                repost(post.id);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
        >
            <View className="w-9 h-9 rounded-full items-center justify-center">
                <MaterialIcons name="cached" size={20} color={hasReposted ? "#22C55E" : "#64748B"} />
            </View>
            <Text className={clsx("text-[13px] font-medium", hasReposted ? "text-green-500" : "text-gray-500")}>
                {post.stats.reposts > 0 ? post.stats.reposts : ''}
            </Text>
        </TouchableOpacity>
    );
}

function ImageModal({ 
    visible, 
    images = [], 
    initialIndex = 0, 
    onClose 
}: { 
    visible: boolean; 
    images: string[] | undefined; 
    initialIndex?: number;
    onClose: () => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    React.useEffect(() => {
        if (visible) setCurrentIndex(initialIndex);
    }, [visible, initialIndex]);

    const handleNext = () => {
        if (images && currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (!images || images.length === 0) return null;

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black justify-center items-center">
                <TouchableOpacity onPress={onClose} className="absolute top-10 right-4 z-10 p-2">
                     <MaterialIcons name="close" size={30} color="white" />
                </TouchableOpacity>

                {images.length > 1 && (
                    <View className="absolute bottom-10 flex-row items-center gap-6 z-10">
                        <TouchableOpacity 
                            onPress={handlePrev} 
                            disabled={currentIndex === 0}
                            className={clsx("p-3 rounded-full bg-white/10", currentIndex === 0 && "opacity-30")}
                        >
                            <MaterialIcons name="chevron-left" size={30} color="white" />
                        </TouchableOpacity>
                        
                        <Text className="text-white font-bold">{currentIndex + 1} / {images.length}</Text>

                        <TouchableOpacity 
                            onPress={handleNext} 
                            disabled={currentIndex === images.length - 1}
                            className={clsx("p-3 rounded-full bg-white/10", currentIndex === images.length - 1 && "opacity-30")}
                        >
                            <MaterialIcons name="chevron-right" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                )}

                <Image source={images[currentIndex]} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            </View>
        </Modal>
    );
}

export function PostItem({ post, onPress }: PostItemProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { mutate: togglePin } = usePinPost();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: votePoll, isPending: isVoting } = usePollVote();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const isAnonymous = post.type === 'anonymous' || post.author.isAnonymous;
  const isAuthor = user?.id === (post.authorId || post.author.id);
  const isPinned = post.isPinned;
  const isCommunityPost = post.postType === 'community' && post.community;

  const handleCommunityPress = () => {
    if (post.community?.id) {
      router.push(`/communities/${post.community.id}` as any);
    }
  };

  const handleAuthorPress = () => {
    // Don't navigate for anonymous posts
    const authorId = post.authorId || post.author.id;
    if (!isAnonymous && authorId) {
      router.push(`/user/${authorId}` as any);
    }
  };

  const handleDeletePost = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePost(post.id, {
              onSuccess: () => {
                Alert.alert('Success', 'Post deleted successfully');
              },
              onError: () => {
                Alert.alert('Error', 'Failed to delete post');
              }
            });
          }
        }
      ]
    );
  };

  // Build options list for the modal
  const getOptions = (): OptionItem[] => {
    const options: OptionItem[] = [];

    // Author-only options
    if (isAuthor) {
      options.push({
        icon: isPinned ? 'push-pin' : 'push-pin',
        label: isPinned ? 'Unpin from Profile' : 'Pin to Profile',
        description: isPinned ? 'Remove from top of your profile' : 'Show this post at the top of your profile',
        variant: 'primary',
        onPress: () => togglePin({ postId: post.id, isPinned: !!isPinned })
      });

      // Delete option for post author
      options.push({
        icon: 'delete',
        label: 'Delete Post',
        description: 'Permanently remove this post',
        variant: 'destructive',
        onPress: handleDeletePost
      });
    }

    // Share option (for everyone)
    options.push({
      icon: 'share',
      label: 'Share Post',
      description: 'Share this post with others',
      variant: 'default',
      onPress: handleShare
    });

    // Copy link option
    options.push({
      icon: 'link',
      label: 'Copy Link',
      description: 'Copy post link to clipboard',
      variant: 'default',
      onPress: () => {
        // TODO: Implement copy to clipboard
        Alert.alert('Copied!', 'Link copied to clipboard');
      }
    });

    // Report option (only for non-authors)
    if (!isAuthor) {
      options.push({
        icon: 'flag',
        label: 'Report Content',
        description: 'Report this post for violating guidelines',
        variant: 'destructive',
        onPress: () => setReportModalVisible(true)
      });
    }

    return options;
  };

  const handleShare = async () => {
      try {
          const result = await Share.share({
              message: `Check out this post from ${post.author.name}: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''} https://uni-social.app/post/${post.id}`,
          });
          if (result.action === Share.sharedAction) {
              if (result.activityType) {
                  // shared with activity type of result.activityType
              } else {
                  // shared
              }
          } else if (result.action === Share.dismissedAction) {
              // dismissed
          }
      } catch (error: any) {
          Alert.alert(error.message);
      }
  };

  const submitReport = async (reason: string) => {
      try {
          await ModerationService.reportContent({
              contentId: post.id,
              contentType: 'post',
              reason
          });
          Alert.alert('Thanks', 'We have received your report.');
      } catch (e) {
          Alert.alert('Error', 'Failed to submit report.');
      }
  };

  const content = (
      <View className="bg-white dark:bg-[#171f26] border-b border-gray-50 dark:border-gray-800/50 px-5 py-4">
        {isPinned && (
            <View className="flex-row items-center gap-1.5 mb-2 -mt-1 ml-11">
                <MaterialIcons name="push-pin" size={14} color="#64748B" />
                <Text className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Pinned</Text>
            </View>
        )}
        {isCommunityPost && (
            <TouchableOpacity 
              onPress={handleCommunityPress}
              className="flex-row items-center gap-1.5 mb-2 -mt-1 ml-11"
            >
                <MaterialIcons name="groups" size={14} color="#9333ea" />
                <Text className="text-[12px] font-bold text-purple-600">Posted in {post.community?.name}</Text>
            </TouchableOpacity>
        )}
        <View className="flex-row gap-3">
          {/* Avatar */}
          <TouchableOpacity 
            className="shrink-0" 
            onPress={(e) => { 
              e.stopPropagation(); 
              isCommunityPost ? handleCommunityPress() : handleAuthorPress(); 
            }}
            disabled={isAnonymous && !isCommunityPost}
            activeOpacity={isAnonymous && !isCommunityPost ? 1 : 0.7}
          >
            {isCommunityPost ? (
              <Image 
                source={post.community?.avatarUrl || 'https://via.placeholder.com/40'} 
                style={{ width: 40, height: 40, borderRadius: 12 }}
                contentFit="cover"
                className="bg-purple-100 border-2 border-purple-200"
              />
            ) : isAnonymous ? (
              <View className="w-10 h-10 rounded-full bg-[#F59E0B]/10 items-center justify-center border border-[#F59E0B]/20">
                <MaterialIcons name="masks" size={20} color="#F59E0B" />
              </View>
            ) : (
              <Image 
                source={post.author.avatar} 
                style={{ width: 40, height: 40, borderRadius: 20 }}
                contentFit="cover"
                className="bg-gray-100 ring-1 ring-gray-100 dark:ring-gray-800"
              />
            )}
          </TouchableOpacity>

          {/* Content */}
          <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-1">
              <TouchableOpacity 
                className="flex-row items-center flex-1 pr-4 flex-wrap"
                onPress={(e) => { 
                  e.stopPropagation(); 
                  isCommunityPost ? handleCommunityPress() : handleAuthorPress(); 
                }}
                disabled={isAnonymous && !isCommunityPost}
                activeOpacity={isAnonymous && !isCommunityPost ? 1 : 0.7}
              >
                <Text numberOfLines={1} className="font-bold text-[15px] text-[#111818] dark:text-gray-100 mr-1.5">
                  {isCommunityPost ? post.community?.name : post.author.name}
                </Text>
                {isCommunityPost && (
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-[4px] mr-1.5">
                    <Text className="text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase tracking-wider">Community</Text>
                  </View>
                )}
                {!isCommunityPost && post.author.isVerified && (
                  <MaterialIcons name="verified" size={14} color="#1990e6" style={{ marginRight: 4 }} />
                )}
                {isAnonymous && (
                  <View className="bg-[#F59E0B]/10 px-1.5 py-0.5 rounded-[4px] mr-1.5">
                    <Text className="text-[#F59E0B] text-[9px] font-bold uppercase tracking-wider">ALIAS</Text>
                  </View>
                )}
                <Text numberOfLines={1} className="text-gray-400 text-sm font-medium">
                  {isCommunityPost 
                    ? `· ${post.createdAt}` 
                    : (post.author.handle && !isAnonymous ? `@${post.author.handle} · ` : '· ') + post.createdAt
                  }
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOptionsModalVisible(true)} className="-mr-2 p-2 opacity-50">
                <MaterialIcons name="more-horiz" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <Text className="text-[15px] text-[#0F1419] dark:text-gray-300 leading-[22px] mb-3 font-normal">
              {post.content}
            </Text>

            {post.poll && (
                <PollView
                    id={post.poll.id}
                    question={post.poll.question}
                    options={post.poll.options}
                    totalVotes={post.poll.totalVotes}
                    timeLeft={post.poll.expiresAt ? new Date(post.poll.expiresAt).toLocaleDateString() : 'Ended'} 
                    hasVoted={post.poll.hasVoted}
                    userVotedOptionId={post.poll.userVotedOptionId}
                    onVote={(pollId, optionId) => votePoll({ pollOptionId: optionId, postId: post.id })}
                    isVoting={isVoting}
                />
            )}

            {/* Images Gallery */}
            {(post.images && post.images.length > 0) ? (
              <View className="flex-row flex-wrap gap-1 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-gray-800/30 mb-3">
                {post.images.length === 1 && (
                  <TouchableOpacity 
                    className="w-full aspect-[16/9]" 
                    onPress={() => { setSelectedImageIndex(0); setImageModalVisible(true); }}
                  >
                    <Image source={post.images[0]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  </TouchableOpacity>
                )}
                
                {post.images.length === 2 && (
                  post.images.map((img, i) => (
                    <TouchableOpacity 
                      key={img} 
                      className="flex-1 aspect-[1/1]" 
                      onPress={() => { setSelectedImageIndex(i); setImageModalVisible(true); }}
                    >
                      <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </TouchableOpacity>
                  ))
                )}

                {post.images.length === 3 && (
                  <View className="w-full gap-1">
                    <TouchableOpacity 
                      className="w-full aspect-[16/9]" 
                      onPress={() => { setSelectedImageIndex(0); setImageModalVisible(true); }}
                    >
                      <Image source={post.images[0]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </TouchableOpacity>
                    <View className="flex-row gap-1">
                      {post.images.slice(1).map((img, i) => (
                        <TouchableOpacity 
                          key={img} 
                          className="flex-1 aspect-[1/1]" 
                          onPress={() => { setSelectedImageIndex(i + 1); setImageModalVisible(true); }}
                        >
                          <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {post.images.length >= 4 && (
                  <View className="flex-row flex-wrap gap-1">
                    {post.images.slice(0, 4).map((img, i) => (
                      <TouchableOpacity 
                        key={img} 
                        className="w-[49%] aspect-[1/1] relative" 
                        onPress={() => { setSelectedImageIndex(i); setImageModalVisible(true); }}
                      >
                        <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        {i === 3 && post.images!.length > 4 && (
                          <View className="absolute inset-0 bg-black/40 items-center justify-center">
                            <Text className="text-white font-bold text-xl">+{post.images!.length - 4}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
                post.image && (
                <TouchableOpacity onPress={() => { setSelectedImageIndex(0); setImageModalVisible(true); }} activeOpacity={0.9}>
                    <View className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/60 aspect-[16/9] bg-gray-50 dark:bg-gray-800/30 mb-3 shadow-sm shadow-black/5">
                        <Image source={post.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    </View>
                </TouchableOpacity>
                )
            )}

            {/* Actions */}
            <View className="flex-row justify-between items-center pr-2 mt-1">
              <TouchableOpacity 
                className="flex-row items-center gap-2 group p-2 -ml-1"
                onPress={onPress}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <View className="w-9 h-9 rounded-full items-center justify-center">
                    <MaterialIcons name="chat-bubble-outline" size={20} color="#64748B" />
                </View>
                <Text className="text-[13px] font-medium text-gray-500">{post.stats.comments > 0 ? post.stats.comments : ''}</Text>
              </TouchableOpacity>
              
              <RepostButton post={post} />
              
              <LikeButton post={post} />

              <TouchableOpacity 
                className="flex-row items-center gap-2 group p-2" 
                onPress={(e) => {
                    e.stopPropagation();
                    handleShare();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <View className="w-9 h-9 rounded-full items-center justify-center">
                    <MaterialIcons name="share" size={20} color="#64748B" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
  );

  const modals = (
      <>
        <ImageModal 
            visible={imageModalVisible} 
            images={post.images || (post.image ? [post.image] : [])} 
            initialIndex={selectedImageIndex}
            onClose={() => setImageModalVisible(false)} 
        />
        
        {/* Post Options Modal */}
        <PostOptionsModal
            visible={optionsModalVisible}
            onClose={() => setOptionsModalVisible(false)}
            options={getOptions()}
            title="Post Options"
        />
        
        {/* Report Modal */}
        <ReportModal
            visible={reportModalVisible}
            onClose={() => setReportModalVisible(false)}
            onSubmit={submitReport}
        />
      </>
  );

  if (onPress) {
      return (
          <>
            <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
                {content}
            </TouchableOpacity>
            {modals}
          </>
      );
  }

  return (
      <>
        {content}
        {modals}
      </>
  );
}
