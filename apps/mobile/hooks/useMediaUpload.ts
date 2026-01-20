import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import apiClient from '../services/api';

export interface UploadedFile {
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
  publicId?: string;
  type: 'image' | 'video';
}

export const useMediaUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async (): Promise<ImagePicker.ImagePickerAsset[] | null> => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return null;
    }

    // Launch picker
    // NOTE: We do NOT set 'quality' here to ensure instant preview. Compression happens at upload.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Using array to avoid deprecation warning
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets;
    }

    return null;
  };

  const uploadFile = async (uri: string): Promise<string | null> => {
    try {
      let uriToUpload = uri;

      // Clean URI
      if (!uri) return null;

      // Compress image if it looks like an image file
      // We can't easily check asset type from just URI, so we assume image for now if from picker
      try {
          const manipulated = await manipulateAsync(
              uri,
              [{ resize: { width: 1080 } }], 
              { compress: 0.8, format: SaveFormat.JPEG }
          );
          uriToUpload = manipulated.uri;
      } catch (e) {
          console.warn('Image compression failed, falling back to original', e);
      }

      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: uriToUpload,
        name: 'upload.jpg',
        type: 'image/jpeg', 
      });

      // Use fetch instead of axios for reliable multipart upload in RN
      // Use fetch instead of axios for reliable multipart upload in RN
      const token = await require('../utils/storage').storage.getItem('accessToken');
      
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      console.log(`Uploading to: ${cleanBaseUrl}/upload`);

      const response = await fetch(`${cleanBaseUrl}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.data.url;
      } else {
        throw new Error(data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const uploadFiles = async (assets: ImagePicker.ImagePickerAsset[]): Promise<UploadedFile[]> => {
      setIsUploading(true);
      const results: UploadedFile[] = [];

      try {
          for (const asset of assets) {
              const url = await uploadFile(asset.uri);
              if (url) {
                  results.push({
                      url,
                      type: 'image', // Assuming image for now
                      originalName: 'upload.jpg',
                      mimetype: asset.mimeType || 'image/jpeg',
                      size: asset.fileSize || 0
                  });
              }
          }
          return results;
      } catch (e) {
          console.error("Batch upload failed", e);
          Alert.alert('Upload Failed', 'Some images failed to upload.');
          return results; // Return whatever succeeded
      } finally {
          setIsUploading(false);
      }
  };

  return {
    pickImage,
    uploadFiles,
    uploadMedia: uploadFile, // Export as uploadMedia to match usage
    isUploading
  };
};
