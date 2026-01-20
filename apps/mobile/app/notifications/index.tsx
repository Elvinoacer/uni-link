import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, useDeleteNotification } from '../../hooks/useNotifications';
import { Notification, NotificationType } from '@uni-social/shared-types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: deleteNotification } = useDeleteNotification();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const notifications = data?.data?.notifications || [];

  const handleNotificationPress = (notif: Notification) => {
    if (!notif.isRead) {
        markRead(notif.id);
    }
    
    // Navigate based on type
    if (notif.entityId) {
        if (notif.type === 'marketplace') {
            router.push('/(tabs)/marketplace');
        } else if (notif.type === 'like' || notif.type === 'reply' || notif.type === 'repost') {
             router.push(`/post/${notif.entityId}` as any);
        } else if (notif.type === 'follow') {
            router.push(`/(tabs)/profile` as any);
        }
    }
  };

  const handleDelete = useCallback((notifId: string) => {
    // Close swipeable
    swipeableRefs.current.get(notifId)?.close();
    
    deleteNotification(notifId, {
      onError: () => {
        Alert.alert('Error', 'Failed to delete notification');
      }
    });
  }, [deleteNotification]);

  const getIconAndColor = (type: NotificationType) => {
    switch (type) {
      case 'like': return { name: 'favorite', color: '#EF4444' };
      case 'repost': return { name: 'repeat', color: '#10B981' };
      case 'reply': return { name: 'chat-bubble', color: '#3B82F6' };
      case 'follow': return { name: 'person-add', color: '#8B5CF6' };
      case 'marketplace': return { name: 'storefront', color: '#F59E0B' };
      case 'event': return { name: 'event', color: '#EC4899' };
      default: return { name: 'notifications', color: '#6B7280' };
    }
  };

  const formatTime = (dateString: Date) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const renderRightActions = useCallback((
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    notifId: string
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => handleDelete(notifId)}
        className="bg-red-500 justify-center items-center px-6 rounded-r-2xl"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <MaterialIcons name="delete" size={24} color="white" />
          <Text className="text-white text-xs font-semibold mt-1">Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }, [handleDelete]);

  const renderNotification = useCallback((notif: any) => {
    const { name, color } = getIconAndColor(notif.type);
    const actor = notif.actor;

    const getInitials = (n: string | null | undefined, u: string | undefined) => {
        if (n) return n.split(' ').map(i => i[0]).join('').toUpperCase().slice(0, 2);
        return (u || 'User').slice(0, 2).toUpperCase();
    };

    const renderAvatar = () => {
        if (actor?.avatarUrl) {
            return <Image source={{ uri: actor.avatarUrl }} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700" />;
        }
        if (actor) {
            return (
                <View className="w-10 h-10 rounded-full bg-indigo-500 items-center justify-center border border-gray-200 dark:border-gray-700">
                    <Text className="text-white font-bold text-xs">{getInitials(actor.displayName, actor.username)}</Text>
                </View>
            );
        }
        return (
            <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
                <MaterialIcons name={name as any} size={20} color={color} />
            </View>
        );
    };

    const renderContent = () => {
        if (actor) {
            const actorName = actor.displayName || actor.username;
            let actionText = '';
            switch (notif.type) {
                case 'like': actionText = 'liked your post'; break;
                case 'repost': actionText = 'shared your post'; break;
                case 'reply': actionText = 'replied to your post'; break;
                case 'follow': actionText = 'started following you'; break;
                case 'event': actionText = 'is attending your event'; break;
                default: actionText = notif.content || 'interacted with you';
            }
            
            if (notif.count > 1) {
                return (
                    <Text className="text-[13px] text-gray-900 dark:text-gray-100 leading-5">
                        <Text className="font-bold">{actorName}</Text> and {notif.count - 1} others {actionText}
                    </Text>
                );
            }
            
            return (
                <Text className="text-[13px] text-gray-900 dark:text-gray-100 leading-5">
                    <Text className="font-bold">{actorName}</Text> {actionText}
                </Text>
            );
        }
        return (
            <View>
                 <Text className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-1 leading-5">
                     {notif.title}
                 </Text>
                 <Text className="text-[13px] text-gray-500 dark:text-gray-400 leading-5">
                     {notif.content}
                 </Text>
            </View>
        );
    };

    return (
      <Swipeable
        key={notif.id}
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(notif.id, ref);
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, notif.id)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity 
          onPress={() => handleNotificationPress(notif)}
          className={`flex-row items-start p-4 mb-3 rounded-2xl border ${notif.isRead ? 'bg-white dark:bg-[#171f26] border-gray-100 dark:border-gray-800' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'}`}
        >
          {/* Avatar or Icon Badge */}
          <View className="relative shrink-0 mr-4">
              {renderAvatar()}
              
              {/* Small Icon Badge Overlay if we are showing Avatar */}
              {actor && (
                  <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#171f26] items-center justify-center border border-gray-100 dark:border-gray-800 shadow-sm">
                      <MaterialIcons name={name as any} size={12} color={color} />
                  </View>
              )}

              {!notif.isRead && (
                  <View className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-[#121212]" />
              )}
          </View>

          <View className="flex-1 justify-center min-h-[40px]">
            {/* Timestamp Row */}
             <View className="flex-row justify-end mb-1">
                <Text className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  {formatTime(notif.createdAt)}
                </Text>
             </View>

            {renderContent()}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }, [handleNotificationPress, renderRightActions]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-white dark:bg-[#121212]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={22} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-lg font-bold dark:text-white">Notifications</Text>
          <TouchableOpacity onPress={() => markAllRead()}>
            <Text className="text-[#1990e6] font-semibold">Mark all read</Text>
          </TouchableOpacity>
        </View>

        {/* Swipe Hint */}
        {notifications.length > 0 && (
          <View className="flex-row items-center justify-center py-2 bg-gray-50 dark:bg-gray-900/50">
            <MaterialIcons name="swipe" size={14} color="#9CA3AF" />
            <Text className="text-[11px] text-gray-400 ml-1">Swipe left to delete</Text>
          </View>
        )}

        {/* Content */}
        <Animated.ScrollView 
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16, paddingTop: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1990e6" />
          }
        >
          {isLoading && !isRefetching ? (
              <View className="py-20">
                  <ActivityIndicator size="large" color="#1990e6" />
              </View>
          ) : (
              <View>
                 {notifications.length === 0 ? (
                     <View className="items-center py-20 opacity-50">
                         <MaterialIcons name="notifications-none" size={64} color="#CBD5E1" />
                         <Text className="text-gray-500 font-medium mt-4">No notifications yet</Text>
                     </View>
                 ) : (
                     notifications.map(renderNotification)
                 )}
              </View>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
