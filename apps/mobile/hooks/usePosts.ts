import { useQuery, useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import apiClient from '../services/api';
import { Post } from '../components/feed/PostItem';

interface PostsResponse {
  success: boolean;
  data: {
    posts: Post[];
    nextCursor: string | null;
  };
}

import { PostService } from '../services/post.service';

export function usePosts(feedType: 'global' | 'following' = 'global') {
  return useInfiniteQuery({
    queryKey: ['posts', feedType],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await PostService.getPosts(pageParam, 10, feedType);
      return {
        ...response,
        data: response.data.map(transformPost)
      };
    },
    getNextPageParam: (lastPage: any, allPages: any) => {
      // Check if we have more pages based on data length or pagination metadata if available
      // Assuming 10 items per page
      return lastPage.data.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1
  });
}

import { transformPost } from '../utils/transformers';

export function usePost(id: string) {
    return useQuery({
        queryKey: ['posts', id],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: any }>(`/posts/${id}`);
            return transformPost(data.data);
        },
        enabled: !!id,
    });
}

import { CreatePostDto } from '@uni-social/shared-types';

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostDto) => {
      const response = await PostService.createPost(data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userActivity'] });
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Update profile stats (posts count)
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await PostService.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userActivity'] });
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Update profile stats (posts count)
    },
  });
}

export function useLikePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (params: { id: string; isCommunity?: boolean; originalId?: string } | string) => {
            const isCommunity = typeof params === 'object' && params.isCommunity;
            const id = typeof params === 'object' ? params.id : params;
            const originalId = typeof params === 'object' ? params.originalId : undefined;
            
            if (isCommunity && originalId) {
                const { data } = await apiClient.post(`/communities/posts/${originalId}/like`);
                return data.data;
            }
            // Fallback or regular post
            const { data } = await apiClient.post(`/posts/${id}/like`);
            return data.data;
        },
        onMutate: async (params) => {
            const isCommunity = typeof params === 'object' && params.isCommunity;
            const id = typeof params === 'object' ? params.id : params;
            const originalId = typeof params === 'object' ? params.originalId : undefined;

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['posts'] });
            if (isCommunity && originalId) {
                await queryClient.cancelQueries({ queryKey: ['community-post', originalId] });
            }

            // Loops helper
            const getNewState = (post: any) => {
                 const currentLiked = typeof post.hasLiked === 'boolean' 
                    ? post.hasLiked 
                    : (post.likes && post.likes.length > 0);
                 
                 const newLiked = !currentLiked;
                 
                 const currentLikesCount = post.likesCount ?? post.stats?.likes ?? post._count?.likes ?? 0;
                 // Note: community posts use `likesCount`, regular posts use `stats.likes` or `_count.likes`
                 
                 return {
                     ...post,
                     hasLiked: newLiked,
                     likesCount: newLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1),
                     stats: post.stats ? {
                         ...post.stats,
                         likes: newLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1),
                     } : undefined,
                     _count: post._count ? {
                         ...post._count,
                         likes: newLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1),
                     } : undefined
                 };
            };
            
            // Optimistically update main feed
            queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
                if (!old) return old;

                // Handle infinite feed (pages)
                if (old?.pages && Array.isArray(old.pages)) {
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            data: page.data.map((post: any) => {
                                if (post.id === id) {
                                    return getNewState(post);
                                }
                                return post;
                            })
                        }))
                    };
                }
                
                // Handle single post (post details)
                if (old.id === id) {
                     return getNewState(old);
                }

                return old;
            });

            // Optimistically update community post detail if applicable
            if (isCommunity && originalId) {
                const communityPostKey = ['community-post', originalId];
                queryClient.setQueryData(communityPostKey, (old: any) => {
                    if (!old) return old;
                    return getNewState(old);
                });
            } else {
                 // Regular post detail
                const singlePostKey = ['posts', id];
                queryClient.setQueryData(singlePostKey, (old: any) => {
                    if (!old) return old;
                    return getNewState(old);
                });
            }


            return { };
        },
        onSuccess: (data, postId) => {
             // Sync with actual server state (Truth)
             const serverLiked = data.liked;

             // Helper to force state
             const updateToFinal = (post: Post) => {
                 const currentLiked = post.hasLiked;
                 // If already matches, do nothing
                 if (currentLiked === serverLiked) return post;
                 
                 const currentLikesCount = post.stats.likes;
                 return {
                     ...post,
                     hasLiked: serverLiked,
                     stats: {
                         ...post.stats,
                         likes: serverLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1)
                     }
                 };
             };

             queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
                 if (!old) return old;
                 if (old.pages) {
                     return {
                         ...old,
                         pages: old.pages.map((page: any) => ({
                             ...page,
                             data: page.data.map((post: Post) => post.id === postId ? updateToFinal(post) : post)
                         }))
                     };
                 }
                 if (old.id === postId) {
                     return updateToFinal(old);
                 }
                 return old;
             });
             
             // Also update single key explicitly
             const singleKey = ['posts', postId];
             queryClient.setQueryData(singleKey, (old: any) => old ? updateToFinal(old) : old);
        },
        onError: (err, newTodo, context) => {
             // On error, just invalidate to be safe/lazy, or we could rollback if we tracked all snapshots (too complex for now)
             queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
    });
}

export function useCreateComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) => {
            const { data } = await apiClient.post(`/posts/${postId}/reply`, { content, parentId });
            return data.data;
        },
        onMutate: async ({ postId, content, parentId }) => {
            await queryClient.cancelQueries({ queryKey: ['posts', postId] });
            
            const previousPost = queryClient.getQueryData(['posts', postId]);
            
            // Only optimistically update top-level comments to avoid complex recursive tree updates
            if (!parentId) {
                // Create optimistic comment
                const optimisticComment: Post = {
                    id: `temp-${Date.now()}`,
                    author: {
                        name: 'You', // In a real app, grab from user context
                        handle: 'you',
                        avatar: 'https://i.pravatar.cc/150', // Placeholder or user avatar
                        isVerified: false
                    },
                    content,
                    createdAt: 'Just now',
                    stats: { comments: 0, reposts: 0, likes: 0 },
                    hasLiked: false,
                    type: 'standard',
                    replies: []
                };

                // Update cache
                queryClient.setQueryData(['posts', postId], (old: Post | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        replies: [optimisticComment, ...(old.replies || [])],
                        stats: {
                            ...old.stats,
                            comments: old.stats.comments + 1
                        }
                    };
                });
            }

            return { previousPost };
        },
        onError: (err, variables, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['posts', variables.postId], context.previousPost);
            }
        },
        onSettled: (data, error, variables) => {
             queryClient.invalidateQueries({ queryKey: ['posts', variables.postId] });
        }
    });
}

export function useRepostPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (postId: string) => {
            const { data } = await apiClient.post(`/posts/${postId}/repost`);
            return data.data;
        },
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['posts'] });

            // Helper to toggle repost count/status
            const updateWrapped = (post: Post) => {
                const hasReposted = post.hasReposted;
                const newReposted = !hasReposted;
                return {
                    ...post,
                    hasReposted: newReposted,
                    stats: {
                        ...post.stats,
                        reposts: newReposted 
                            ? post.stats.reposts + 1 
                            : Math.max(0, post.stats.reposts - 1)
                    }
                };
            };
            
            // 1. Update Infinite List
            queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((post: Post) => post.id === postId ? updateWrapped(post) : post)
                    }))
                };
            });

            // 2. Update Single Post
            const singleKey = ['posts', postId];
            const singleData = queryClient.getQueryData(singleKey);
            if (singleData) {
                queryClient.setQueryData(singleKey, (old: any) => old ? updateWrapped(old) : old);
            }
        },
        onSuccess: () => {
             // Refresh feeds after repost
             queryClient.invalidateQueries({ queryKey: ['posts'] });
             queryClient.invalidateQueries({ queryKey: ['userActivity'] });
        },
        onError: () => {
             queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
    });
}

export function usePollVote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ pollOptionId, postId }: { pollOptionId: string; postId: string }) => {
            return PostService.votePoll(pollOptionId);
        },
        onMutate: async ({ pollOptionId, postId }: { pollOptionId: string; postId: string }) => {
            await queryClient.cancelQueries({ queryKey: ['posts'] });
            
            // Optimistic update helper
            const updatePostPoll = (post: Post) => {
                if (!post.poll) return post;
                
                // If same option, do nothing
                if (post.poll.hasVoted && post.poll.userVotedOptionId === pollOptionId) return post;

                const previousOptionId = post.poll.userVotedOptionId;
                const isChangingVote = post.poll.hasVoted && previousOptionId;

                return {
                    ...post,
                    poll: {
                        ...post.poll,
                        hasVoted: true,
                        userVotedOptionId: pollOptionId,
                        totalVotes: isChangingVote ? post.poll.totalVotes : post.poll.totalVotes + 1,
                        options: post.poll.options.map(opt => {
                            if (opt.id === pollOptionId) {
                                return { ...opt, votes: opt.votes + 1 };
                            }
                            if (isChangingVote && opt.id === previousOptionId) {
                                return { ...opt, votes: Math.max(0, opt.votes - 1) };
                            }
                            return opt;
                        })
                    }
                };
            };

            // Update Infinite Feed
            queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
                if (!old) return old;
                
                if (old.pages) {
                     return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            data: page.data.map((post: Post) => {
                                if (post.id === postId) {
                                    return updatePostPoll(post);
                                }
                                return post;
                            })
                        }))
                    };
                }
                return old;
            });
            
            return { prev: null };
        },
        onError: (err, variables, context: any) => {
             // Rollback
             queryClient.invalidateQueries({ queryKey: ['posts'] });
             const isCommunity = typeof variables === 'object' && variables.isCommunity;
             const originalId = typeof variables === 'object' ? variables.originalId : undefined;
             if (isCommunity && originalId) {
                queryClient.invalidateQueries({ queryKey: ['community-post', originalId] });
             }
        },
        onSettled: (data, error, variables) => {
             queryClient.invalidateQueries({ queryKey: ['posts'] });
             const isCommunity = typeof variables === 'object' && variables.isCommunity;
             const originalId = typeof variables === 'object' ? variables.originalId : undefined;
             if (isCommunity && originalId) {
                queryClient.invalidateQueries({ queryKey: ['community-post', originalId] });
             }
        }
    });
}
