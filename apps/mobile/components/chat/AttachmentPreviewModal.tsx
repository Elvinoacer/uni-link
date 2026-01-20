import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';

export interface PendingAttachment {
    id: string;
    uri: string;
    name: string;
    type: 'image' | 'video' | 'document';
    mimeType: string;
    size?: number;
}

interface AttachmentPreviewModalProps {
    visible: boolean;
    attachment: PendingAttachment | null;
    onConfirm: (attachment: PendingAttachment) => void;
    onCancel: () => void;
}

export function AttachmentPreviewModal({ visible, attachment, onConfirm, onCancel }: AttachmentPreviewModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUri, setCurrentUri] = useState<string | null>(null);

    React.useEffect(() => {
        if (attachment) {
            setCurrentUri(attachment.uri);
        }
    }, [attachment]);

    if (!attachment) return null;

    const isImage = attachment.type === 'image';

    const handleCrop = async () => {
        if (!currentUri) return;
        
        setIsProcessing(true);
        try {
            // Get image dimensions first
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ resize: { width: 1024 } }], // Resize to max 1024px width
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
        } catch (error) {
            console.error('Image manipulation error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRotate = async () => {
        if (!currentUri) return;
        
        setIsProcessing(true);
        try {
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ rotate: 90 }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
        } catch (error) {
            console.error('Rotation error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        onConfirm({
            ...attachment,
            uri: currentUri || attachment.uri
        });
    };

    const getFileIcon = () => {
        if (attachment.mimeType.includes('pdf')) return 'picture-as-pdf';
        if (attachment.mimeType.includes('word') || attachment.mimeType.includes('document')) return 'description';
        if (attachment.mimeType.includes('spreadsheet') || attachment.mimeType.includes('excel')) return 'table-chart';
        if (attachment.mimeType.includes('presentation') || attachment.mimeType.includes('powerpoint')) return 'slideshow';
        return 'insert-drive-file';
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView className="flex-1 bg-black">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3">
                    <TouchableOpacity onPress={onCancel} className="p-2">
                        <MaterialIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-semibold">Preview</Text>
                    <TouchableOpacity 
                        onPress={handleConfirm} 
                        disabled={isProcessing}
                        className="bg-[#5eb2ed] px-4 py-2 rounded-full"
                    >
                        <Text className="text-white font-semibold">Add</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View className="flex-1 items-center justify-center p-4">
                    {isImage ? (
                        <>
                            {isProcessing && (
                                <View className="absolute z-10 bg-black/50 rounded-lg p-4">
                                    <ActivityIndicator size="large" color="white" />
                                </View>
                            )}
                            <Image 
                                source={{ uri: currentUri || attachment.uri }} 
                                className="w-full h-96 rounded-lg"
                                resizeMode="contain"
                            />
                        </>
                    ) : (
                        <View className="items-center justify-center p-8 bg-gray-800 rounded-2xl">
                            <View className="size-24 rounded-full bg-gray-700 items-center justify-center mb-4">
                                <MaterialIcons name={getFileIcon()} size={48} color="#94A3B8" />
                            </View>
                            <Text className="text-white text-lg font-medium text-center" numberOfLines={2}>
                                {attachment.name}
                            </Text>
                            <Text className="text-gray-400 text-sm mt-2">
                                {formatFileSize(attachment.size)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Image Tools */}
                {isImage && (
                    <View className="flex-row items-center justify-center gap-8 pb-8">
                        <TouchableOpacity 
                            onPress={handleRotate}
                            disabled={isProcessing}
                            className="items-center"
                        >
                            <View className="size-14 rounded-full bg-gray-800 items-center justify-center mb-2">
                                <MaterialIcons name="rotate-right" size={28} color="white" />
                            </View>
                            <Text className="text-gray-300 text-xs">Rotate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleCrop}
                            disabled={isProcessing}
                            className="items-center"
                        >
                            <View className="size-14 rounded-full bg-gray-800 items-center justify-center mb-2">
                                <MaterialIcons name="crop" size={28} color="white" />
                            </View>
                            <Text className="text-gray-300 text-xs">Optimize</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}
