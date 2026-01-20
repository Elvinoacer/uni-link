import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCreateStory } from '../../hooks/useStories';
import { apiClient } from '../../services/api';

export default function StoryCreationScreen() {
  const router = useRouter();
  const { mutate: createStory, isPending: isCreating } = useCreateStory();
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Allow optional cropping
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
    }
  };

  const handlePost = async () => {
    if (!image) return;

    try {
        setIsUploading(true);
        
        // 1. Upload Image
        const formData = new FormData();
        const filename = image.split('/').pop() || 'story.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('file', {
            uri: image,
            name: filename,
            type: type
        } as any);

        // Correct way for RN Axios with configured instance:
        const uploadRes = await apiClient.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            transformRequest: (data, headers) => {
                // Return data as is, don't let axios serialize it to JSON
                return data;
            }
        });

        if (!uploadRes.data.success) {
            throw new Error(uploadRes.data.error || 'Upload failed');
        }

        const uploadedUrl = uploadRes.data.data.url;

        // 2. Create Story
        createStory({ 
            mediaUrl: uploadedUrl, 
            mediaType: 'image',
            caption: caption.trim() 
        }, {
            onSuccess: () => {
                router.back();
            },
            onError: (err) => {
                console.error('Story creation error:', err);
                Alert.alert('Error', 'Failed to save story.');
            }
        });

    } catch (e: any) {
        console.error('Upload/Create error:', e);
        // Show detailed error to user for debugging
        const errorMessage = e.response?.data?.error || e.message || 'Unknown error';
        Alert.alert('Upload Failed', `Could not upload image: ${errorMessage}`);
    } finally {
        setIsUploading(false);
    }
  };

  const isLoading = isCreating || isUploading;

  if (!image) {
      return (
          <View className="flex-1 bg-black items-center justify-center">
              <TouchableOpacity onPress={pickImage} className="items-center">
                  <View className="size-20 rounded-full bg-white/20 items-center justify-center mb-4">
                      <MaterialIcons name="photo-library" size={32} color="white" />
                  </View>
                  <Text className="text-white font-bold text-lg">Create a Story</Text>
                  <Text className="text-gray-400 mt-2">Pick a photo to share with friends</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-4 p-2">
                  <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
          </View>
      );
  }

  return (
    <View className="flex-1 bg-black">
      <Image source={{ uri: image }} className="flex-1" resizeMode="contain" />
      
      {/* Dark overlay at bottom for visibility */}
      <View className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-black/80 to-transparent" />
      
      <SafeAreaView className="absolute inset-0 justify-between p-4">
          <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => setImage(null)} className="p-2 bg-black/40 rounded-full">
                  <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
          </View>
          
          <View>
             <View className="mb-4">
                <TextInput
                   placeholder="Add a caption..."
                   placeholderTextColor="#ddd"
                   value={caption}
                   onChangeText={setCaption}
                   className="text-white text-center text-lg font-medium px-4 py-2 bg-black/30 rounded-xl"
                   maxLength={100}
                />
             </View>

              <View className="flex-row justify-end items-center">
              <TouchableOpacity 
                onPress={handlePost}
                disabled={isLoading}
                className="bg-[#1990e6] px-6 py-3 rounded-full flex-row items-center gap-2"
              >
                  {isLoading ? (
                      <ActivityIndicator color="white" />
                  ) : (
                      <>
                        <Text className="text-white font-bold">Post Story</Text>
                        <MaterialIcons name="send" size={20} color="white" />
                      </>
                  )}
              </TouchableOpacity>
              </View>
          </View>
      </SafeAreaView>
    </View>
  );
}
