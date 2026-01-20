import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { Event } from './EventTrendingCard';

interface EventRsvpItemProps {
  event: Event;
  categoryIcon: string;
  categoryColor: string;
}

export function EventRsvpItem({ event, categoryIcon, categoryColor }: EventRsvpItemProps) {
  return (
    <TouchableOpacity className="flex-row items-center gap-4 bg-white dark:bg-[#1e2124] p-3 rounded-lg border border-black/5 dark:border-white/5 shadow-sm mb-3">
      <View className={clsx("size-12 rounded-lg flex items-center justify-center shrink-0", categoryColor)}>
         <MaterialIcons name={categoryIcon as any} size={24} color="#087d7d" style={{ opacity: 0.8 }} />
      </View>
      <View className="flex-1">
         <Text className="text-sm font-bold leading-none dark:text-white">{event.title}</Text>
         <Text className="text-[11px] text-slate-500 mt-1">
            {event.time} • {event.location}
         </Text>
      </View>
      <View className="size-8 rounded-full bg-slate-50 dark:bg-slate-700 items-center justify-center">
         <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}
