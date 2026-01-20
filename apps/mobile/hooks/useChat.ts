import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ChatService } from '../services/chat.service';
import { socketService } from '../services/socket';

export function useConversations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleNewMessage = () => {
      // Invalidate conversations list to show new message/unread count
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socketService.on('new_message', handleNewMessage);
    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [queryClient]);

  return useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await ChatService.getConversations(pageParam as number, 15);
      return res.data; // { conversations: [], hasMore: boolean } or just []
    },
    getNextPageParam: (lastPage: any, allPages) => {
       const conversations = lastPage.conversations || lastPage; 
       const items = Array.isArray(conversations) ? conversations : [];
       return items.length === 15 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useChatMessages(conversationId: string) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!conversationId) return;

        const handleNewMessage = (data: any) => {
            if (data.conversationId === conversationId) {
                // Invalidate messages query to fetch new message
                // Optimally we would append to cache for smoother UX, but this ensures correctness first
                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            }
        };

        socketService.on('new_message', handleNewMessage);
        return () => {
            socketService.off('new_message', handleNewMessage);
        };
    }, [conversationId, queryClient]);

    return useInfiniteQuery({
        queryKey: ['messages', conversationId],
        queryFn: async ({ pageParam = 1 }) => {
            const res = await ChatService.getMessages(conversationId, pageParam as number);
            return res.data;
        },
        getNextPageParam: (lastPage, allPages) => {
             const messages = Array.isArray(lastPage) ? lastPage : [];
             // Backend default limit is 50, so if we get 50, there might be more
             return messages.length === 50 ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
        enabled: !!conversationId
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ recipientId, content, imageUrl }: { recipientId: string, content: string, imageUrl?: string }) => {
            return ChatService.sendMessage(recipientId, content, imageUrl);
        },
        onSuccess: (data, variables) => {
            // Invalidate conversations to update last message
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            // Ideally also optimistic update the messages list
        }
    });
}

export function useDeleteMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (messageId: string) => {
            return ChatService.deleteMessage(messageId);
        },
        onSuccess: () => {
             // Invalidate to refresh message list
             queryClient.invalidateQueries({ queryKey: ['messages'] });
             queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });
}
