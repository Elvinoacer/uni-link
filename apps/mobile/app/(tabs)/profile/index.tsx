import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Modal, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import clsx from 'clsx';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAuthStore } from '../../../store/authStore';
import { useUserActivity, usePublicProfile } from '../../../hooks/useProfile';
import { PostItem } from '../../../components/feed/PostItem';
import { MarketItemCard } from '../../../components/market/MarketItemCard';
import { useCreatePost } from '../../../hooks/usePosts';
import { useMediaUpload } from '../../../hooks/useMediaUpload';
import { useUserGallery, useAddToGallery, useDeleteFromGallery } from '../../../hooks/useGallery';
import { useQueryClient } from '@tanstack/react-query';
import { useTabBarAnimation } from '../../../context/TabBarContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: profile } = usePublicProfile(user?.id || '');

  const { data: activity, isLoading: isLoadingActivity } = useUserActivity(user?.id);
  const { data: galleryItems, isLoading: isLoadingGallery } = useUserGallery(user?.id);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'gallery' | 'market' | 'events'>('posts');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { mutate: addToGallery, isPending: isAddingToGallery } = useAddToGallery();
  const { mutate: deleteFromGallery, isPending: isDeleting } = useDeleteFromGallery();
  
  const { pickImage, uploadFiles, isUploading: isUploadingMedia } = useMediaUpload();

  // Tab Bar Animation
  const { tabBarTranslateY } = useTabBarAnimation();
  const lastContentOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentOffset = event.contentOffset.y;
      const diff = currentOffset - lastContentOffset.value;

      // Ignore bounces
      if (currentOffset <= 0 || currentOffset > event.contentSize.height - event.layoutMeasurement.height) {
        lastContentOffset.value = currentOffset;
        return;
      }

      if (Math.abs(diff) < 10) return;

      if (diff > 0) {
          // Scrolling Down -> Hide
          if (tabBarTranslateY.value !== 100) {
              tabBarTranslateY.value = withTiming(100, { duration: 300 });
          }
      } else {
          // Scrolling Up -> Show
          if (tabBarTranslateY.value !== 0) {
              tabBarTranslateY.value = withTiming(0, { duration: 300 });
          }
      }
      lastContentOffset.value = currentOffset;
    },
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const onDeleteImage = () => {
      if (!selectedImage) return;

      // Find the gallery item associated with the selected image
      const itemToDelete = galleryItems?.find((item: any) => item.imageUrl === selectedImage);
      
      if (!itemToDelete) {
          Alert.alert('Error', 'Could not find image to delete');
          return;
      }

      Alert.alert(
          'Delete Image',
          'Are you sure you want to delete this image? This cannot be undone.',
          [
              { text: 'Cancel', style: 'cancel' },
              { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => {
                      deleteFromGallery(itemToDelete.id, {
                          onSuccess: () => {
                              setSelectedImage(null);
                              Alert.alert('Success', 'Image deleted');
                          },
                          onError: () => {
                              Alert.alert('Error', 'Failed to delete image');
                          }
                      });
                  }
              }
          ]
      );
  };
  
  const renderImageModal = () => (
      <Modal
          visible={!!selectedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
      >
          <View className="flex-1 bg-black/95 justify-center items-center relative">
              <StatusBar hidden={true} />
              
              {/* Close Button */}
              <TouchableOpacity 
                  onPress={() => setSelectedImage(null)}
                  className="absolute top-12 right-6 z-50 p-2 bg-black/40 rounded-full"
              >
                  <MaterialIcons name="close" size={30} color="white" />
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity 
                  onPress={onDeleteImage}
                  disabled={isDeleting}
                  className="absolute top-12 left-6 z-50 p-2 bg-black/40 rounded-full"
              >
                  {isDeleting ? (
                      <ActivityIndicator color="white" />
                  ) : (
                      <MaterialIcons name="delete" size={30} color="#ef4444" />
                  )}
              </TouchableOpacity>
              
              {selectedImage && (
                  <Image 
                      source={{ uri: selectedImage }} 
                      style={{ width: width, height: '100%' }}
                      contentFit="contain"
                  />
              )}
          </View>
      </Modal>
  );

  const handleAddToGallery = async () => {
      try {
          // 1. Pick Image
          const assets = await pickImage();
          if (!assets || assets.length === 0) return;

          // 2. Upload
          const uploadedMedia = await uploadFiles(assets);
          if (uploadedMedia.length === 0) return; // Error handled in hook

          // 3. Create Gallery Items
          let successCount = 0;
          for (const media of uploadedMedia) {
             addToGallery(media.url, {
                 onSuccess: () => successCount++
             });
          }
          // Note: Logic above is simplified; ideally wait for all promises.
          // Since react-query mutation is async, we can just let them fire.
          // Or use Promise.all if we exposed the promise from hook, but useMutation doesn't return promise by default on mutate.
          // For now, assume success as optimistic updates will handle UI if properly set, 
          // but we are invalidating queries on success.
          
          Alert.alert('Success', 'Adding to gallery...');
          
      } catch (error) {
          console.error('Gallery upload error:', error);
          Alert.alert('Error', 'Something went wrong');
      }
  };

  const isUploading = isAddingToGallery || isUploadingMedia;

  if (!user) return null;

  return (
    <View className="flex-1 bg-white dark:bg-[#121212]">
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Profile Header Background */}
        <View className="h-48 bg-[#1990e6] relative">
          <Image 
            source={{ uri: profile?.bannerUrl || user.bannerUrl || 'https://images.unsplash.com/photo-1541339907198-e08756ebafe1?w=800&fit=crop' }} 
            className="w-full h-full opacity-60"
            contentFit="cover"
          />
          <SafeAreaView className="absolute top-0 left-0 right-0 p-4">
             <View className="flex-row justify-between">
                <TouchableOpacity onPress={() => router.back()} className="size-10 rounded-full bg-black/20 items-center justify-center backdrop-blur-md">
                   <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} className="size-10 rounded-full bg-black/20 items-center justify-center backdrop-blur-md">
                   <MaterialIcons name="logout" size={22} color="white" />
                </TouchableOpacity>
             </View>
          </SafeAreaView>
        </View>

        {/* Profile Info */}
        <View className="px-6 -mt-16">
          <View className="size-32 rounded-3xl border-4 border-white dark:border-[#121212] overflow-hidden bg-gray-200">
             <Image 
                source={{ uri: user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}` }} 
                className="w-full h-full"
                contentFit="cover"
             />
          </View>
          
          <View className="mt-4 flex-row justify-between items-end">
             <View>
                <Text className="text-2xl font-black dark:text-white">{profile?.displayName || user.displayName || user.username}</Text>
                <Text className="text-[#1990e6] font-bold">@{profile?.username || user.username}</Text>
             </View>
             <View className="flex-row gap-2">
                <TouchableOpacity 
                   onPress={() => router.push('/edit-portfolio')}
                   className="border border-[#1990e6] px-4 py-2 rounded-full"
                >
                   <Text className="text-[#1990e6] font-bold">Portfolio</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={() => router.push('/edit-profile')}
                   className="bg-[#1990e6] px-4 py-2 rounded-full"
                >
                   <Text className="text-white font-bold">Edit Profile</Text>
                </TouchableOpacity>
             </View>
          </View>

          <Text className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
             {profile?.bio || 'No bio yet. Tap edit to add one!'}
          </Text>

          {/* Stats */}
          <View className="flex-row mt-6 py-4 border-y border-gray-100 dark:border-gray-800">
             <View className="flex-1 items-center">
                <Text className="text-xl font-black dark:text-white">{profile?.postsCount || 0}</Text>
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">Posts</Text>
             </View>
             <View className="flex-1 items-center border-x border-gray-100 dark:border-gray-800">
                <Text className="text-xl font-black dark:text-white">{profile?.followingCount || 0}</Text>
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">Following</Text>
             </View>
             <View className="flex-1 items-center">
                <Text className="text-xl font-black dark:text-white">{profile?.followersCount || 0}</Text>
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">Followers</Text>
             </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row px-6 mt-4 border-b border-gray-100 dark:border-gray-800">
           {(['posts', 'gallery', 'market', 'events'] as const).map(tab => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                className={clsx(
                  "flex-1 items-center py-4 border-b-2",
                  activeTab === tab ? "border-[#1990e6]" : "border-transparent"
                )}
              >
                 <Text className={clsx(
                   "text-sm font-bold capitalize",
                   activeTab === tab ? "text-[#1990e6]" : "text-gray-400"
                 )}>
                    {tab}
                 </Text>
              </TouchableOpacity>
           ))}
        </View>

        {/* Content */}
        <View className="p-4">
           {activeTab === 'posts' && (
              <View>
                 {activity?.posts?.map((post: any) => (
                    <View key={post.id} className="mb-4">
                       <PostItem post={post} />
                    </View>
                 ))}
                 {!activity?.posts?.length && (
                    <View className="py-20 items-center">
                       <MaterialIcons name="post-add" size={48} color="#ccc" />
                       <Text className="text-gray-400 mt-2">No posts yet</Text>
                    </View>
                 )}
              </View>
           )}

           {activeTab === 'gallery' && (
              <View>
                 <View className="flex-row flex-wrap">
                    {/* Add Photo Button */}
                    <TouchableOpacity 
                      onPress={handleAddToGallery}
                      disabled={isUploading}
                      style={{ width: (width - 48) / 3, height: (width - 48) / 3 }}
                      className="m-1 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700"
                    >
                       {isUploading ? (
                           <ActivityIndicator color="#1990e6" />
                       ) : (
                           <>
                               <MaterialIcons name="add-a-photo" size={32} color="#1990e6" />
                               <Text className="text-xs font-bold text-[#1990e6] mt-1">Add Photo</Text>
                           </>
                       )}
                    </TouchableOpacity>

                    {/* Gallery Grid */}
                    {galleryItems?.map((item: any) => (
                       <TouchableOpacity 
                         key={item.id} 
                         onPress={() => setSelectedImage(item.imageUrl)}
                         style={{ width: (width - 48) / 3, height: (width - 48) / 3 }}
                         className="m-1 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800"
                       >
                          <Image 
                            source={{ uri: item.imageUrl }} 
                            className="w-full h-full" 
                            contentFit="cover" 
                          />
                       </TouchableOpacity>
                    ))}
                 </View>

                 {!galleryItems?.length && !isUploading && (
                    <View className="py-10 items-center">
                       <Text className="text-gray-400 mt-2 text-center px-10">
                           Your gallery is empty. Upload photos to show them on your profile!
                       </Text>
                    </View>
                 )}
              </View>
           )}

           {/* Image Viewer Modal */}
           {renderImageModal()}

           {activeTab === 'market' && (
              <View className="flex-row flex-wrap justify-between px-2">
                 {activity?.listings?.map((item: any) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={{ width: '48%' }} 
                      className="mb-4"
                      onPress={() => router.push(`/marketplace/${item.id}` as any)}
                    >
                       <MarketItemCard item={item} onPress={() => router.push(`/marketplace/${item.id}` as any)} />
                    </TouchableOpacity>
                 ))}
                 {!activity?.listings?.length && (
                    <View className="w-full py-20 items-center">
                       <MaterialIcons name="shopping-bag" size={48} color="#ccc" />
                       <Text className="text-gray-400 mt-2">No listings yet</Text>
                       <TouchableOpacity 
                         onPress={() => router.push('/marketplace/create')}
                         className="mt-4 bg-[#1990e6] px-6 py-2 rounded-full"
                       >
                          <Text className="text-white font-bold">Create Listing</Text>
                       </TouchableOpacity>
                    </View>
                 )}
              </View>
           )}

           {activeTab === 'events' && (
              <View>
                 {activity?.events?.map((event: any) => (
                    <TouchableOpacity 
                      key={event.id} 
                      onPress={() => router.push(`/events/${event.id}` as any)}
                      className="mb-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl flex-row items-center"
                    >
                       <View className="size-12 bg-[#087d7d]/10 rounded-xl items-center justify-center mr-4">
                          <MaterialIcons name="event" size={24} color="#087d7d" />
                       </View>
                       <View className="flex-1">
                          <Text className="font-bold dark:text-white">{event.title}</Text>
                          <Text className="text-xs text-gray-500">{new Date(event.startsAt).toLocaleDateString()}</Text>
                       </View>
                       <View className="bg-[#087d7d] px-2 py-1 rounded-full mr-2">
                          <Text className="text-white text-[10px] font-bold">Going</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                 ))}
                 {!activity?.events?.length && (
                    <View className="py-20 items-center">
                       <MaterialIcons name="event-available" size={48} color="#ccc" />
                       <Text className="text-gray-400 mt-2">No joined events</Text>
                       <TouchableOpacity 
                         onPress={() => router.push('/(tabs)/events')}
                         className="mt-4 bg-[#087d7d] px-6 py-2 rounded-full"
                       >
                          <Text className="text-white font-bold">Browse Events</Text>
                       </TouchableOpacity>
                    </View>
                 )}
              </View>
           )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
