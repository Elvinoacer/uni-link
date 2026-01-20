import React, { useCallback } from 'react';
import { View, Text, SectionList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { usePost, useCreateComment } from '../../hooks/usePosts';
import { PostItem } from '../../components/feed/PostItem';
import { CommentItem, Comment } from '../../components/feed/CommentItem';

export default function PostDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const postId = typeof id === 'string' ? id : id[0];
    const { data: post, isLoading, refetch, isRefetching } = usePost(postId);
    const { mutate: addComment, isPending: isCommenting } = useCreateComment();
    const [replyText, setReplyText] = React.useState('');
    const [replyingTo, setReplyingTo] = React.useState<{ id: string; name: string } | null>(null);
    const inputRef = React.useRef<TextInput>(null);

    const handleReplyToComment = useCallback((commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, name: authorName });
        inputRef.current?.focus();
    }, []);

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const handleReply = () => {
        if (!replyText.trim()) return;
        addComment({ 
            postId, 
            content: replyText,
            parentId: replyingTo?.id 
        }, {
            onSuccess: () => {
                setReplyText('');
                setReplyingTo(null);
                refetch(); // Refresh to show new comment
            }
        });
    };

    // Transform reply data to Comment format
    const transformReply = useCallback((reply: any): Comment => ({
        id: reply.id,
        author: {
            name: reply.author?.name || reply.author?.displayName || reply.author?.username || 'Unknown',
            avatar: reply.author?.avatar || reply.author?.avatarUrl || `https://i.pravatar.cc/150?u=${reply.id}`,
            isVerified: reply.author?.isVerified,
            isAnonymous: reply.author?.isAnonymous || reply.isAnonymous
        },
        content: reply.content,
        createdAt: reply.createdAt,
        likesCount: reply._count?.likes || reply.likesCount || 0,
        hasLiked: reply.likes?.length > 0 || reply.hasLiked || false,
        replies: reply.replies?.map(transformReply) || []
    }), []);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26] items-center justify-center">
                <ActivityIndicator color="#1990e6" />
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
             <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26] items-center justify-center">
                <Text className="text-gray-500">Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-primary">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Prepare sections for SectionList
    const comments = post.replies?.map(transformReply) || [];
    const sections = [
        { title: 'replies', data: comments.length > 0 ? comments : [{ empty: true }] as any }
    ];

    const renderItem = ({ item }: { item: Comment | { empty: boolean } }) => {
        if ('empty' in item) {
            return (
                <Text className="text-gray-400 text-center py-6">No replies yet. Be the first!</Text>
            );
        }
        return (
            <View className="mb-4 px-4">
                <CommentItem 
                    comment={item}
                    onReply={handleReplyToComment}
                    maxVisibleReplies={2}
                />
            </View>
        );
    };

    const ListHeader = () => (
        <View>
            <PostItem post={post} />
            <View className="border-t border-gray-100 dark:border-gray-800 pt-4 pb-2 px-4">
                <Text className="text-sm font-bold opacity-60 uppercase tracking-wider text-gray-500">
                    Replies ({comments.length})
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26]">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="mr-4 p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#111818" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-[#111818] dark:text-white flex-1">Post</Text>
                {isRefetching && <ActivityIndicator size="small" color="#1990e6" />}
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item, index) => 'empty' in item ? 'empty' : item.id}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                stickySectionHeadersEnabled={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                onRefresh={refetch}
                refreshing={isRefetching}
            />

            {/* Reply Indicator */}
            {replyingTo && (
                <View className="flex-row items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                    <View className="flex-row items-center">
                        <MaterialIcons name="reply" size={16} color="#3B82F6" />
                        <Text className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                            Replying to <Text className="font-semibold">@{replyingTo.name}</Text>
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={cancelReply}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons name="close" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Input */}
            <View className="p-3 border-t border-gray-100 dark:border-gray-800 flex-row items-end gap-2 bg-white dark:bg-[#171f26]">
                 <TextInput 
                    ref={inputRef}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 text-base text-gray-900 dark:text-white"
                    placeholder={replyingTo ? `Reply to @${replyingTo.name}...` : "Post your reply"}
                    placeholderTextColor="#9CA3AF"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    style={{ maxHeight: 120, minHeight: 40 }}
                    textAlignVertical="top"
                 />
                 <TouchableOpacity 
                    onPress={handleReply} 
                    disabled={!replyText.trim() || isCommenting}
                    className={`p-3 rounded-full ${!replyText.trim() ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: !replyText.trim() ? '#E5E7EB' : '#1990e6' }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                 >
                     {isCommenting ? (
                         <ActivityIndicator size="small" color="white" />
                     ) : (
                         <MaterialIcons name="send" size={22} color={!replyText.trim() ? "#9CA3AF" : "white"} />
                     )}
                 </TouchableOpacity>
            </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
