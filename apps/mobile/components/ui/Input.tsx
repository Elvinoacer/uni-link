import React from 'react';
import { TextInput, View, Text } from 'react-native';
import clsx from 'clsx';
import { MaterialIcons } from '@expo/vector-icons';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  className?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  leftIcon,
  rightIcon,
  onRightIconPress,
  className,
  autoCapitalize = 'none',
  keyboardType = 'default',
}: InputProps) {
  return (
    <View className={clsx('space-y-3', className)}>
      {label && (
        <Text className="text-sm font-semibold text-text-light dark:text-text-dark opacity-80 ml-1">
          {label}
        </Text>
      )}
      
      <View className="relative">
        {leftIcon && (
          <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center z-10 w-10 h-full">
            <MaterialIcons name={leftIcon} size={20} color="#1990e6" />
          </View>
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          placeholderTextColor="#9CA3AF"
          className={clsx(
            'w-full h-14 bg-card-light dark:bg-card-dark rounded-xl text-base font-medium text-text-light dark:text-text-dark',
            'focus:border-2 focus:border-primary/50',
            leftIcon ? 'pl-12' : 'pl-4',
            rightIcon ? 'pr-12' : 'pr-4',
            error ? 'border-2 border-red-500' : 'border border-transparent'
          )}
        />

        {rightIcon && (
          <View className="absolute inset-y-0 right-3 flex items-center justify-center h-full">
            <MaterialIcons 
              name={rightIcon} 
              size={20} 
              color="#9CA3AF" 
              onPress={onRightIconPress}
            />
          </View>
        )}
      </View>

      {error && (
        <Text className="text-xs text-red-500 ml-1 font-medium">
          {error}
        </Text>
      )}
    </View>
  );
}
