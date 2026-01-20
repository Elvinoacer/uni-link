import React from 'react';
import { View } from 'react-native';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'ghost';
  onPress?: () => void;
}

export function Card({ children, className, variant = 'default', onPress }: CardProps) {
  const baseStyles = 'rounded-xl p-4 transition-all';
  
  const variantStyles = {
    default: 'bg-card-light dark:bg-card-dark shadow-sm border border-gray-100 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
    ghost: 'bg-transparent hover:bg-card-light/50',
  };

  return (
    <View className={clsx(baseStyles, variantStyles[variant], className)}>
      {children}
    </View>
  );
}
