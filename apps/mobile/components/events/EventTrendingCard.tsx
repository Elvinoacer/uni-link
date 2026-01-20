import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';

export interface RsvpUser {
  id: string;
  username?: string;
  avatarUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  date: { month: string; day: string };
  time: string;
  location: string;
  attendees: number;
  image: string;
  isGoing?: boolean;
  rsvps?: { user: RsvpUser }[];
}

interface EventTrendingCardProps {
  event: Event;
  onPress: () => void;
  onRsvp?: (eventId: string, currentStatus: boolean) => void;
  isRsvping?: boolean;
}

export function EventTrendingCard({ event, onPress, onRsvp, isRsvping }: EventTrendingCardProps) {
  const attendeeAvatars = event.rsvps?.slice(0, 3) || [];
  
  const handleRsvp = (e: any) => {
    e.stopPropagation();
    if (onRsvp) {
      onRsvp(event.id, !!event.isGoing);
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      className="min-w-[280px] bg-white dark:bg-[#1e2124] rounded-xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5 mr-4"
    >
      <View className="h-32 relative">
        <Image source={{ uri: event.image }} className="w-full h-full" resizeMode="cover" />
        <View className="absolute top-3 left-3 bg-white shadow-md px-2 py-1 rounded-md items-center justify-center min-w-[40px]">
          <Text className="text-[10px] font-bold text-slate-500 leading-none mb-0.5">{event.date.month}</Text>
          <Text className="text-sm font-black text-[#087d7d] leading-none">{event.date.day}</Text>
        </View>
      </View>
      
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-1">
          <Text numberOfLines={2} className="font-bold text-sm leading-tight max-w-[80%] dark:text-white">
            {event.title}
          </Text>
          <TouchableOpacity>
             <MaterialIcons name="notifications-none" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        <Text className="text-[11px] text-slate-500 flex-row items-center gap-1">
           {event.time} • {event.location}
        </Text>

        <View className="mt-3 flex-row items-center justify-between">
           <View className="flex-row -space-x-2">
              {attendeeAvatars.map((rsvp, i) => (
                 <View key={rsvp.user.id || i} className="size-6 rounded-full border-2 border-white dark:border-[#1e2124] overflow-hidden bg-slate-300">
                    {rsvp.user.avatarUrl ? (
                      <Image source={{ uri: rsvp.user.avatarUrl }} className="w-full h-full" />
                    ) : (
                      <View className="w-full h-full bg-slate-400" />
                    )}
                 </View>
              ))}
              {event.attendees > 0 && (
                <View className="size-6 rounded-full border-2 border-white dark:border-[#1e2124] bg-[#087d7d]/20 items-center justify-center">
                   <Text className="text-[8px] font-bold text-[#087d7d]">+{event.attendees}</Text>
                </View>
              )}
           </View>
           <TouchableOpacity 
             onPress={handleRsvp}
             disabled={isRsvping}
             className={clsx("px-3 py-1.5 rounded-full", event.isGoing ? "bg-[#087d7d]" : "bg-[#087d7d]/10")}
           >
              {isRsvping ? (
                <ActivityIndicator size="small" color={event.isGoing ? "#fff" : "#087d7d"} />
              ) : (
                <Text className={clsx("text-[10px] font-bold uppercase tracking-wider", event.isGoing ? "text-white" : "text-[#087d7d]")}>
                   {event.isGoing ? 'Going' : 'RSVP'}
                </Text>
              )}
           </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
