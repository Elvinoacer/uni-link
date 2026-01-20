import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface OptionItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'destructive' | 'primary';
  description?: string;
}

interface PostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  options: OptionItem[];
  title?: string;
}

export function PostOptionsModal({ visible, onClose, options, title = 'Options' }: PostOptionsModalProps) {
  const getVariantStyles = (variant: OptionItem['variant'] = 'default') => {
    switch (variant) {
      case 'destructive':
        return {
          iconBg: 'bg-red-500/10',
          iconColor: '#EF4444',
          textColor: 'text-red-500',
        };
      case 'primary':
        return {
          iconBg: 'bg-[#1990e6]/10',
          iconColor: '#1990e6',
          textColor: 'text-[#1990e6]',
        };
      default:
        return {
          iconBg: 'bg-gray-100 dark:bg-gray-800',
          iconColor: '#6B7280',
          textColor: 'text-gray-800 dark:text-gray-200',
        };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable 
          onPress={onClose}
          className="absolute inset-0 bg-black/60"
        />
        
        {/* Modal Content */}
        <View className="bg-white dark:bg-[#1a2128] rounded-t-[28px] overflow-hidden">
          {/* Handle Bar */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          {/* Title */}
          <View className="px-6 pb-4 pt-2 border-b border-gray-100 dark:border-gray-800">
            <Text className="text-lg font-bold text-gray-900 dark:text-white text-center">
              {title}
            </Text>
          </View>

          {/* Options */}
          <View className="px-4 py-3">
            {options.map((option, index) => {
              const styles = getVariantStyles(option.variant);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    option.onPress();
                    onClose();
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center p-4 rounded-2xl mb-2 active:bg-gray-50 dark:active:bg-gray-800/50"
                >
                  {/* Icon Container */}
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${styles.iconBg}`}>
                    <MaterialIcons name={option.icon} size={24} color={styles.iconColor} />
                  </View>

                  {/* Text Content */}
                  <View className="flex-1 ml-4">
                    <Text className={`text-base font-semibold ${styles.textColor}`}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {option.description}
                      </Text>
                    )}
                  </View>

                  {/* Arrow */}
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel Button */}
          <View className="px-4 pb-8 pt-2">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="bg-gray-100 dark:bg-gray-800 py-4 rounded-2xl items-center"
            >
              <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Report Reason Modal - A secondary modal for selecting report reasons
interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const reportReasons = [
  { id: 'spam', label: 'Spam', icon: 'block' as const, description: 'Misleading or repeated content' },
  { id: 'harassment', label: 'Harassment', icon: 'person-off' as const, description: 'Bullying or threatening behavior' },
  { id: 'inappropriate', label: 'Inappropriate Content', icon: 'visibility-off' as const, description: 'Nudity, violence, or sensitive media' },
  { id: 'misinformation', label: 'Misinformation', icon: 'info' as const, description: 'False or misleading information' },
];

export function ReportModal({ visible, onClose, onSubmit }: ReportModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable 
          onPress={onClose}
          className="absolute inset-0 bg-black/60"
        />
        
        {/* Modal Content */}
        <View className="bg-white dark:bg-[#1a2128] rounded-t-[28px] overflow-hidden max-h-[80%]">
          {/* Handle Bar */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          {/* Header */}
          <View className="px-6 pb-4 pt-2 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center justify-center mb-2">
              <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-3">
                <MaterialIcons name="flag" size={20} color="#EF4444" />
              </View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Report Content
              </Text>
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Help us understand what's happening
            </Text>
          </View>

          {/* Reasons */}
          <View className="px-4 py-3">
            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => {
                  onSubmit(reason.id);
                  onClose();
                }}
                activeOpacity={0.7}
                className="flex-row items-center p-4 rounded-2xl mb-2 bg-gray-50 dark:bg-gray-800/30"
              >
                <View className="w-11 h-11 rounded-xl bg-red-500/10 items-center justify-center">
                  <MaterialIcons name={reason.icon} size={22} color="#EF4444" />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-base font-semibold text-gray-800 dark:text-gray-200">
                    {reason.label}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {reason.description}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <View className="px-4 pb-8 pt-2">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="bg-gray-100 dark:bg-gray-800 py-4 rounded-2xl items-center"
            >
              <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
