import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import clsx from 'clsx';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { EventTrendingCard } from '../../../components/events/EventTrendingCard';
import { EventRsvpItem } from '../../../components/events/EventRsvpItem';
import { EventBannerCarousel } from '../../../components/events/EventBannerCarousel';
import { useEvents, useMyEvents, useRsvp } from '../../../hooks/useEvents';
import { useUnreadNotificationsCount } from '../../../hooks/useNotifications';
import { useAuthStore } from '../../../store/authStore';
import { useTabBarAnimation } from '../../../context/TabBarContext';

function MyCreatedEventsSection() {
  const router = useRouter();
  const { data: myEvents, isLoading, isError, refetch } = useMyEvents();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  if (isLoading) return <ActivityIndicator size="small" color="#087d7d" className="mt-6" />;
  
  if (!myEvents || myEvents.length === 0) {
      return (
        <View className="mt-6 px-4">
           <Text className="text-lg font-bold tracking-tight dark:text-white mb-2">My Created Events</Text>
           <View className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <Text className="text-gray-400 text-center">You haven't created any events yet.</Text>
           </View>
        </View>
      );
  }

  return (
    <View className="mt-6 px-4">
       <View className="flex-row items-center justify-between pb-3">
          <Text className="text-lg font-bold tracking-tight dark:text-white">My Created Events</Text>
          <View className="bg-orange-500/10 px-2 py-0.5 rounded-md">
             <Text className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Creator</Text>
          </View>
       </View>
       <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
          {myEvents.map((e: any) => (
             <EventTrendingCard 
                key={e.id} 
                event={{...transformEvent(e), image: e.imageUrl || e.image}} // formatting
                onPress={() => router.push(`/events/${e.id}` as any)} 
             />
          ))}
       </ScrollView>
    </View>
  );
}

const FILTERS = [
  { id: '1', icon: 'explore', label: 'Near Me', active: true },
  { id: '2', icon: 'school', label: 'Academic', active: false },
  { id: '3', icon: 'celebration', label: 'Social', active: false },
  { id: '4', icon: 'fitness-center', label: 'Sports', active: false },
];

function transformEvent(event: any) {
  const date = new Date(event.startsAt);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return {
    ...event,
    date: {
      month: months[date.getMonth()],
      day: date.getDate().toString()
    },
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attendees: event.attendeesCount || 0
  };
}

export default function EventsScreen() {
  const router = useRouter();
  const [activeFilterId, setActiveFilterId] = useState('1'); 
  const filterType = activeFilterId === '1' ? 'nearby' : 'all';
  const { data: events, isLoading, refetch } = useEvents('all'); // Always fetch all events
  
  // Notification count for bell indicator
  const { data: unreadCount } = useUnreadNotificationsCount();
  
  // User info for dynamic university name
  const { user } = useAuthStore();

  // RSVP mutation
  const { mutate: rsvpMutate, isPending: isRsvping } = useRsvp();
  const [rsvpingEventId, setRsvpingEventId] = useState<string | null>(null);

  // Tab Bar Animation
  const { tabBarTranslateY } = useTabBarAnimation();
  const lastContentOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentOffset = event.contentOffset.y;
      const diff = currentOffset - lastContentOffset.value;

      // Ignore bounces
      if (currentOffset <= 0 || currentOffset > event.contentSize.height - event.layoutMeasurement.height) {
        lastContentOffset.value = currentOffset;
        return;
      }

      if (Math.abs(diff) < 10) return;

      if (diff > 0) {
          // Scrolling Down -> Hide
          if (tabBarTranslateY.value !== 100) {
              tabBarTranslateY.value = withTiming(100, { duration: 300 });
          }
      } else {
          // Scrolling Up -> Show
          if (tabBarTranslateY.value !== 0) {
              tabBarTranslateY.value = withTiming(0, { duration: 300 });
          }
      }
      lastContentOffset.value = currentOffset;
    },
  });

  const handleCardRsvp = (eventId: string, currentStatus: boolean) => {
    setRsvpingEventId(eventId);
    const newStatus = currentStatus ? 'not_going' : 'going';
    rsvpMutate({ eventId, status: newStatus }, {
      onSuccess: () => {
        refetch();
        setRsvpingEventId(null);
      },
      onError: () => {
        Alert.alert('Error', 'Failed to update RSVP.');
        setRsvpingEventId(null);
      }
    });
  };
  
  // Derive university name from email domain or use default
  const getUniversityName = () => {
    if (user?.email) {
      const domain = user.email.split('@')[1];
      if (domain) {
        // Extract university name from domain (e.g., stanford.edu -> Stanford)
        const name = domain.split('.')[0];
        return name.charAt(0).toUpperCase() + name.slice(1) + ' Campus';
      }
    }
    return 'Campus Central';
  };

  // Map API events to UI format
  const trendingEvents = (Array.isArray(events) ? events : []).map((event: any) => {
      const e = transformEvent(event);
      // Fix property mismatches if any
      return {
          ...e,
          image: event.imageUrl || e.image,
          attendees: event._count?.rsvps || event.rsvpCount || event.attendeesCount || 0,
          rsvps: event.rsvps || [],
          isGoing: event.isGoing || event.isRsvped
      };
  });
  
  // Filter events based on selected category
  const filteredEvents = activeFilterId === '1' 
    ? trendingEvents 
    : trendingEvents.filter((e: any) => {
        const category = e.category?.toLowerCase() || '';
        if (activeFilterId === '2') return category.includes('academic') || category.includes('school');
        if (activeFilterId === '3') return category.includes('social') || category.includes('party');
        if (activeFilterId === '4') return category.includes('sports') || category.includes('fitness');
        return true;
      });
  
  const rsvpEvents = trendingEvents.filter((e: any) => e.isGoing || e.isRsvped); // Use real isGoing flag


  const now = new Date();

  // Sort and Categorize Events
  const ongoingEvents = filteredEvents.filter((e: any) => {
      const start = new Date(e.startsAt);
      const end = new Date(e.endsAt);
      return start <= now && end > now;
  }).sort((a: any, b: any) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());

  const upcomingEvents = filteredEvents.filter((e: any) => {
      return new Date(e.startsAt) > now;
  }).sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const pastEvents = filteredEvents.filter((e: any) => {
      return new Date(e.endsAt) <= now;
  }).sort((a: any, b: any) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());

  // Combined for banner (Ongoing + Upcoming)
  const bannerEvents = [...ongoingEvents, ...upcomingEvents].slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-[#faf6f0] dark:bg-[#171f26]">
       {/* Header */}
       <View className="px-4 py-3 flex-row items-center justify-between bg-white/80 dark:bg-[#171f26]/80 backdrop-blur-md sticky top-0 z-50 border-b border-black/5 dark:border-white/5">
          <View className="flex-row items-center gap-3">
             <View className="size-10 rounded-full bg-[#087d7d]/10 items-center justify-center">
                <MaterialIcons name="event" size={24} color="#087d7d" />
             </View>
             <View>
                <Text className="text-sm font-bold leading-none dark:text-white">Campus Events</Text>
                <Text className="text-[10px] text-[#087d7d] font-medium uppercase tracking-wider">{getUniversityName()}</Text>
             </View>
          </View>
          <View className="flex-row gap-2">
             <TouchableOpacity onPress={() => router.push('/search')} className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm">
                <MaterialIcons name="search" size={24} color="#64748B" />
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={() => router.push('/notifications')}
               className="size-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-sm relative"
             >
                <MaterialIcons name="notifications-none" size={24} color="#64748B" />
                {(unreadCount || 0) > 0 && (
                  <View className="absolute top-2.5 right-2.5 size-1.5 bg-[#FF5252] rounded-full ring-1 ring-white dark:ring-[#171f26]" />
                )}
             </TouchableOpacity>
          </View>
       </View>

       <Animated.ScrollView contentContainerStyle={{ paddingBottom: 100 }} onScroll={scrollHandler} scrollEventThrottle={16}>
          {/* Banner Carousel (Ongoing & Upcoming) */}
          <View className="py-4">
             <View className="flex-row items-center justify-between px-4 pb-3">
                <Text className="text-lg font-bold tracking-tight dark:text-white">Events Nearby</Text>
                <Text className="text-[#087d7d] text-xs font-bold uppercase tracking-wider">{filteredEvents.length} events</Text>
             </View>
             <EventBannerCarousel events={bannerEvents.length > 0 ? bannerEvents : upcomingEvents} maxEvents={10} />
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} className="mb-4">
             {FILTERS.map(f => (
                <TouchableOpacity 
                   key={f.id}
                   onPress={() => setActiveFilterId(f.id)}
                   className={clsx(
                      "flex-row h-9 items-center justify-center gap-2 rounded-full px-4 mr-2 border border-black/5",
                      activeFilterId === f.id ? "bg-[#087d7d]" : "bg-white dark:bg-slate-800"
                   )}
                >
                   <MaterialIcons name={f.icon as any} size={16} color={activeFilterId === f.id ? "white" : "#64748B"} />
                   <Text className={clsx("text-xs font-bold", activeFilterId === f.id ? "text-white" : "text-slate-500")}>{f.label}</Text>
                </TouchableOpacity>
             ))}
          </ScrollView>

          {isLoading ? (
             <View className="px-4 py-10 items-center">
                <ActivityIndicator color="#087d7d" />
             </View>
          ) : (
             <>
                {/* 1. Happening Now */}
                {ongoingEvents.length > 0 && (
                   <View className="mt-4">
                      <View className="flex-row items-center justify-between px-4 pb-3">
                         <View className="flex-row items-center gap-2">
                             <View className="size-2 bg-green-500 rounded-full animate-pulse" />
                             <Text className="text-lg font-bold tracking-tight dark:text-white">Happening Now</Text>
                         </View>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                         {ongoingEvents.map((e: any) => (
                            <EventTrendingCard key={e.id} event={e as any} onPress={() => router.push(`/events/${e.id}` as any)} onRsvp={handleCardRsvp} isRsvping={rsvpingEventId === e.id} />
                         ))}
                      </ScrollView>
                   </View>
                )}

                {/* 2. Upcoming Events */}
                <View className="mt-4">
                   <View className="flex-row items-center justify-between px-4 pb-3">
                      <Text className="text-lg font-bold tracking-tight dark:text-white">Upcoming Events</Text>
                   </View>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                      {upcomingEvents.map((e: any) => (
                         <EventTrendingCard key={e.id} event={e as any} onPress={() => router.push(`/events/${e.id}` as any)} onRsvp={handleCardRsvp} isRsvping={rsvpingEventId === e.id} />
                      ))}
                      {upcomingEvents.length === 0 && ongoingEvents.length === 0 && (
                        <Text className="text-gray-500 italic px-4">No upcoming events found.</Text>
                      )}
                   </ScrollView>
                </View>

                {/* 3. Past Events */}
                {pastEvents.length > 0 && (
                   <View className="mt-6 opacity-60">
                      <View className="flex-row items-center justify-between px-4 pb-3">
                         <Text className="text-lg font-bold tracking-tight dark:text-white">Past Events</Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                         {pastEvents.map((e: any) => (
                            <EventTrendingCard key={e.id} event={e as any} onPress={() => router.push(`/events/${e.id}` as any)} onRsvp={handleCardRsvp} isRsvping={rsvpingEventId === e.id} />
                         ))}
                      </ScrollView>
                   </View>
                )}
             </>
          )}

          {/* My Created Events */}
          <MyCreatedEventsSection />

          {/* My RSVPs */}
          <View className="mt-6 mb-24 px-4">
             <View className="flex-row items-center justify-between pb-3">
                <Text className="text-lg font-bold tracking-tight dark:text-white">My RSVPs</Text>
                {rsvpEvents.length > 0 && (
                  <View className="bg-[#087d7d]/10 px-2 py-0.5 rounded-md">
                     <Text className="text-[#087d7d] text-[10px] font-black uppercase tracking-widest">{rsvpEvents.length} Upcoming</Text>
                  </View>
                )}
             </View>
             
             <View>
                {rsvpEvents.map((e: any) => (
                  <EventRsvpItem key={e.id} event={e as any} categoryIcon="event" categoryColor="bg-[#087d7d]/10" />
                ))}
                {rsvpEvents.length === 0 && (
                  <View className="bg-white dark:bg-slate-800 p-6 rounded-2xl items-center border border-dashed border-gray-300">
                    <Text className="text-gray-400">Not going to any events yet.</Text>
                  </View>
                )}
             </View>
          </View>
       </Animated.ScrollView>

       {/* Create Event FAB */}
       <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => router.push('/events/create')}
          className="absolute bottom-24 right-4 size-14 rounded-full bg-[#087d7d] items-center justify-center shadow-lg shadow-[#087d7d]/40 border-4 border-white dark:border-[#171f26] z-50 pointer-events-auto"
       >
          <MaterialIcons name="add" size={32} color="white" />
       </TouchableOpacity>
    </SafeAreaView>
  );
}
