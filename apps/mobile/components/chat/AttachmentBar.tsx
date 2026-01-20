import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PendingAttachment } from './AttachmentPreviewModal';

interface AttachmentBarProps {
    attachments: PendingAttachment[];
    onRemove: (id: string) => void;
    onAddMore: () => void;
}

export function AttachmentBar({ attachments, onRemove, onAddMore }: AttachmentBarProps) {
    if (attachments.length === 0) return null;

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'picture-as-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table-chart';
        return 'insert-drive-file';
    };

    return (
        <View className="bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-3 py-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row items-center gap-2">
                    {attachments.map((attachment) => (
                        <View key={attachment.id} className="relative">
                            {attachment.type === 'image' ? (
                                <Image 
                                    source={{ uri: attachment.uri }} 
                                    className="size-16 rounded-lg bg-gray-200"
                                />
                            ) : (
                                <View className="size-16 rounded-lg bg-gray-200 dark:bg-slate-700 items-center justify-center">
                                    <MaterialIcons name={getFileIcon(attachment.mimeType)} size={24} color="#64748B" />
                                    <Text className="text-[8px] text-gray-500 mt-1 px-1" numberOfLines={1}>
                                        {attachment.name.split('.').pop()?.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <TouchableOpacity 
                                onPress={() => onRemove(attachment.id)}
                                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 items-center justify-center"
                            >
                                <MaterialIcons name="close" size={14} color="white" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    {/* Add more button */}
                    <TouchableOpacity 
                        onPress={onAddMore}
                        className="size-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 items-center justify-center"
                    >
                        <MaterialIcons name="add" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
