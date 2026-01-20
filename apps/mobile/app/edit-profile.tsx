
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserService } from '../services/user.service';
import { uploadService } from '../services/upload.service';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const queryClient = useQueryClient();

  // Form State
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  
  // Image State
  const [avatar, setAvatar] = useState(user?.avatarUrl);
  const [banner, setBanner] = useState(user?.bannerUrl || 'https://images.unsplash.com/photo-1541339907198-e08756ebafe1?w=800&fit=crop');
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [newBannerUri, setNewBannerUri] = useState<string | null>(null);

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error('User not found');
      return UserService.updateUser(user.id, data);
    },
    onSuccess: async () => {
      // Refresh Auth Store and Queries
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  });

  const pickImage = async (type: 'avatar' | 'banner') => {
    // Request permissions
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Sorry', 'We need camera roll permissions to make this work!');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9], // Aspect ratio depending on type
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'avatar') {
        setNewAvatarUri(result.assets[0].uri);
      } else {
        setNewBannerUri(result.assets[0].uri);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    let finalAvatarUrl = user.avatarUrl;
    let finalBannerUrl = user.bannerUrl;

    if (newAvatarUri) {
      // Upload new avatar
      try {
        const uploadResult = await uploadService.uploadImage(newAvatarUri);
        finalAvatarUrl = uploadResult.url;
      } catch (error) {
        Alert.alert('Error', 'Failed to upload profile picture');
        return;
      }
    }

    if (newBannerUri) {
      // Upload new banner
      try {
        const uploadResult = await uploadService.uploadImage(newBannerUri);
        finalBannerUrl = uploadResult.url;
      } catch (error) {
        Alert.alert('Error', 'Failed to upload banner');
        return;
      }
    }

    // Call API
    updateProfileMutation.mutate({
      displayName,
      bio,
      avatarUrl: finalAvatarUrl,
      bannerUrl: finalBannerUrl
    });
  };

  return (
    <View className="flex-1 bg-white dark:bg-[#121212]">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-4 pt-12 pb-4 flex-row justify-between items-center border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Text className="text-gray-500 text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold dark:text-white">Edit Profile</Text>
        <TouchableOpacity 
            onPress={handleSave} 
            disabled={updateProfileMutation.isPending}
            className="p-2 -mr-2"
        >
            {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color="#1990e6" />
            ) : (
                <Text className="text-[#1990e6] font-bold text-base">Save</Text>
            )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
          {/* Banner Edit */}
          <TouchableOpacity onPress={() => pickImage('banner')} activeOpacity={0.8}>
            <View className="h-40 bg-gray-200 dark:bg-gray-800 relative">
                <Image 
                    source={{ uri: newBannerUri || banner }} 
                    className="w-full h-full opacity-80"
                    resizeMode="cover"
                />
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                     <View className="bg-black/40 p-2 rounded-full">
                         <MaterialIcons name="add-a-photo" size={24} color="white" />
                     </View>
                </View>
            </View>
          </TouchableOpacity>

          {/* Avatar Edit */}
          <View className="px-4 -mt-10 mb-6">
              <View className="flex-row justify-between items-end">
                  <TouchableOpacity onPress={() => pickImage('avatar')} activeOpacity={0.8}>
                    <View className="size-24 rounded-full border-4 border-white dark:border-[#121212] bg-gray-200 relative overflow-hidden">
                        <Image 
                            source={{ uri: newAvatarUri || avatar || 'https://i.pravatar.cc/150' }} 
                            className="w-full h-full"
                        />
                         <View className="absolute inset-0 items-center justify-center bg-black/20">
                             <MaterialIcons name="add-a-photo" size={20} color="white" />
                         </View>
                    </View>
                  </TouchableOpacity>
              </View>
          </View>

          {/* Fields */}
          <View className="px-4 gap-6">
              <View>
                  <Text className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Name</Text>
                  <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      className="text-lg border-b border-gray-200 dark:border-gray-800 pb-2 dark:text-white font-medium"
                      placeholder="Display Name"
                      placeholderTextColor="#9CA3AF"
                  />
                  <Text className="text-xs text-gray-400 mt-1">This is how you will appear to others.</Text>
              </View>

              <View>
                  <Text className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Bio</Text>
                  <TextInput
                      value={bio}
                      onChangeText={setBio}
                      className="text-base border-b border-gray-200 dark:border-gray-800 pb-2 dark:text-white leading-6"
                      placeholder="Add a bio to your profile"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      maxLength={160}
                  />
                  <Text className="text-xs text-gray-400 mt-1 self-end">{bio.length}/160</Text>
              </View>
              
               <View>
                  <Text className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide pb-2 border-b border-gray-200 dark:border-gray-800 opacity-50">Username</Text>
                 <Text className="text-lg text-gray-400 font-medium">@{user?.username}</Text>
                 <Text className="text-xs text-gray-400 mt-1">Username cannot be changed.</Text>
              </View>

          </View>
          
          <View className="h-20" />
      </ScrollView>
    </View>
  );
}
