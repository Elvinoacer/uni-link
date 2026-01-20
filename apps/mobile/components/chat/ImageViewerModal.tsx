import React from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Dimensions, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
// Use legacy API to avoid deprecation error
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

interface ImageViewerModalProps {
    visible: boolean;
    imageUrl: string;
    onClose: () => void;
}

export function ImageViewerModal({ visible, imageUrl, onClose }: ImageViewerModalProps) {
    const [downloading, setDownloading] = React.useState(false);

    const handleDownload = async () => {
        if (!imageUrl) return;
        
        setDownloading(true);
        try {
            // Extract filename from URL
            const filename = imageUrl.split('/').pop() || 'image.jpg';
            const fileUri = FileSystem.documentDirectory + filename;
            
            // Download the file
            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
            
            // Share/save the file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadResult.uri);
            }
        } catch (error) {
            console.error('Download error:', error);
        } finally {
            setDownloading(false);
        }
    };

    if (!imageUrl) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <StatusBar backgroundColor="black" barStyle="light-content" />
            <View className="flex-1 bg-black">
                {/* Header */}
                <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-10">
                    <View className="flex-row items-center justify-between px-4 py-3">
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <MaterialIcons name="close" size={28} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleDownload} 
                            disabled={downloading}
                            className="p-2"
                        >
                            <MaterialIcons 
                                name={downloading ? "hourglass-empty" : "download"} 
                                size={28} 
                                color="white" 
                            />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Image */}
                <View className="flex-1 items-center justify-center">
                    <Image 
                        source={{ uri: imageUrl }} 
                        style={{ width, height: height * 0.8 }}
                        resizeMode="contain"
                    />
                </View>
            </View>
        </Modal>
    );
}
