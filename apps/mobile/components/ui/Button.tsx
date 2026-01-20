import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cn } from '../../utils/cn';

interface ButtonProps {
  onPress?: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  textClassName,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const baseStyles = 'flex-row items-center justify-center rounded-xl transition-all active:scale-[0.98]';
  
  const variantStyles = {
    primary: 'bg-primary shadow-lg shadow-primary/25',
    secondary: 'bg-card-light dark:bg-card-dark border-2 border-transparent hover:border-primary/30',
    outline: 'bg-transparent border-2 border-primary',
    ghost: 'bg-transparent',
    danger: 'bg-red-500 shadow-lg shadow-red-500/25',
  };

  const textStyles = {
    primary: 'text-white font-bold',
    secondary: 'text-text-light dark:text-text-dark font-bold',
    outline: 'text-primary font-bold',
    ghost: 'text-primary font-bold',
    danger: 'text-white font-bold',
  };

  const sizeStyles = {
    sm: 'py-2 px-4',
    md: 'py-4 px-6',
    lg: 'py-5 px-8',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50',
        className
      )}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#1990e6' : 'white'} />
      ) : (
        <>
          {leftIcon && <Text className="mr-2 text-current">{leftIcon}</Text>}
          <Text
            className={cn(
              textStyles[variant],
              textSizeStyles[size],
              'text-center',
              textClassName
            )}
          >
            {title}
          </Text>
          {rightIcon && <Text className="ml-2 text-current">{rightIcon}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}
