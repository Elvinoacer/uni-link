import apiClient from './api';

export interface UploadedFile {
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
  publicId?: string;
  type: 'image' | 'video';
}

export const uploadService = {
  async uploadImage(uri: string): Promise<UploadedFile> {
    const formData = new FormData();
    
    // Extract filename and type from URI
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore - React Native FormData expects this structure
    formData.append('file', {
      uri,
      name: filename,
      type,
    });

    try {
      const response = await apiClient.post<{ success: boolean; data: UploadedFile }>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => {
          // React Native FormData should not be stringified by Axios/json
          return data; 
        },
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Upload service error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to upload image');
    }
  }
};
