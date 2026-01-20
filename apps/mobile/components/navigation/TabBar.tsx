import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { useColorScheme } from 'react-native';
import { useTabBarAnimation } from '../../context/TabBarContext';
import { useRouter } from 'expo-router';

// Helper component for standard tab icon
function TabBarIcon({ name, color, focused, label }: { name: keyof typeof MaterialIcons.glyphMap, color: string, focused: boolean, label: string }) {
  return (
    <View className="items-center justify-center gap-1 mt-2">
      <MaterialIcons name={name} size={24} color={color} />
      <Text className={clsx("text-[10px] font-bold", focused ? "text-[#1990e6]" : "text-gray-400")}>
        {label}
      </Text>
    </View>
  );
}

// Helper for FAB
function CustomFAB() {
  const router = useRouter();
  return (
    <View className="relative -top-5">
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => router.push('/post/new')}
        className="w-14 h-14 rounded-full bg-[#1990e6] items-center justify-center shadow-lg shadow-primary/40 border-4 border-white dark:border-[#171f26]"
      >
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { tabBarTranslateY } = useTabBarAnimation();
  const colorScheme = useColorScheme();
  const activeColor = '#1990e6';
  const inactiveColor = '#9CA3AF';

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: tabBarTranslateY.value }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colorScheme === 'dark' ? 'rgba(23, 31, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
          height: 85,
          paddingBottom: 20,
          flexDirection: 'row',
          zIndex: 100, // Ensure it sits above content
        },
        animatedStyle,
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key] as { options: any };
        
        // Skip hidden routes
        if (options.href === null) return null;

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Render FAB for the special route
        if (route.name === 'post_fab') {
             return (
                 <View key={route.key} className="flex-1 items-center justify-center">
                    <CustomFAB />
                 </View>
             )
        }

        // Determine icon name based on route name (mapping logic from original _layout)
        let iconName: keyof typeof MaterialIcons.glyphMap = 'circle';
        if (route.name === 'home/index') iconName = 'home';
        else if (route.name === 'marketplace/index') iconName = 'storefront';
        else if (route.name === 'communities/index') iconName = 'groups';
        else if (route.name === 'resources/index') iconName = 'menu-book';
        else if (route.name === 'events/index') iconName = 'event';
        else if (route.name === 'profile/index') iconName = 'person';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
             <TabBarIcon 
                name={iconName} 
                color={isFocused ? activeColor : inactiveColor} 
                focused={isFocused} 
                label={label as string} 
             />
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}
