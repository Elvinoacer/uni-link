import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEvent, useRsvp } from '../../hooks/useEvents';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const eventId = typeof id === 'string' ? id : id[0];
  const { data: event, isLoading } = useEvent(eventId);
  const { mutate: rsvp, isPending: isRsvping } = useRsvp();
  const { user } = useAuthStore();
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const images = event ? ((event.images && event.images.length > 0) ? event.images : [event.imageUrl || event.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&fit=crop']) : [];

  // Auto-swipe
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeSlide + 1) % images.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveSlide(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlide, images.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveSlide(viewableItems[0].index || 0);
    }
  }).current;

  const isCreator = event && user?.id === (event.organizerId || event.organizer?.id);
  
  // Normalize isGoing from backend's isRsvped field
  const isGoing = event?.isRsvped || event?.isGoing || false;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-[#1a1a1a] items-center justify-center">
        <ActivityIndicator color="#087d7d" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-white dark:bg-[#1a1a1a] items-center justify-center p-6">
        <Text className="text-lg font-bold dark:text-white">Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#087d7d] px-6 py-2 rounded-full">
           <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRsvp = () => {
      const newStatus = isGoing ? 'not_going' : 'going';
      rsvp({ eventId, status: newStatus }, {
          onSuccess: () => {
              Alert.alert('Success', newStatus === 'going' ? 'You are going to this event!' : 'Removed from your events.');
          },
          onError: () => {
              Alert.alert('Error', 'Failed to update RSVP status.');
          }
      });
  };

  const date = new Date(event.startsAt);

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover Image */}
        <View className="relative bg-gray-200 dark:bg-slate-800" style={{ height: width * 0.8 }}>
           <FlatList 
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
              renderItem={({ item }) => (
                  <Image 
                    source={{ uri: item }} 
                    style={{ width, height: width * 0.8 }}
                    resizeMode="cover"
                  />
              )}
           />

           {images.length > 1 && (
               <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5 z-10">
                   {images.map((_, i) => (
                       <View key={i} className={`h-1.5 rounded-full ${i === activeSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                   ))}
               </View>
           )}
           
           {/* Header Overlay */}
           <SafeAreaView className="absolute top-0 left-0 right-0 z-50 flex-row justify-between px-4 pt-2">
              <TouchableOpacity onPress={() => router.back()} className="size-10 rounded-full bg-white/90 dark:bg-black/40 items-center justify-center backdrop-blur-md">
                 <MaterialIcons name="arrow-back-ios-new" size={20} color="#111818" />
              </TouchableOpacity>
              <View className="flex-row gap-2">
                 {isCreator && (
                    <TouchableOpacity 
                      onPress={() => router.push(`/events/edit/${eventId}` as any)}
                      className="size-10 rounded-full bg-white/90 dark:bg-black/40 items-center justify-center backdrop-blur-md"
                    >
                       <MaterialIcons name="edit" size={20} color="#111818" />
                    </TouchableOpacity>
                 )}
                 <TouchableOpacity className="size-10 rounded-full bg-white/90 dark:bg-black/40 items-center justify-center backdrop-blur-md">
                    <MaterialIcons name="share" size={20} color="#111818" />
                 </TouchableOpacity>
              </View>
           </SafeAreaView>
        </View>

        <View className="px-5 pt-6">
           {/* Date Badge */}
           <View className="self-start bg-[#087d7d]/10 px-3 py-1 rounded-full mb-3">
              <Text className="text-[#087d7d] font-bold text-xs uppercase tracking-wider">
                  {date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
           </View>
           
           <Text className="text-2xl font-extrabold text-[#111818] dark:text-white leading-tight mb-2">
              {event.title}
           </Text>

           {/* Location */}
           <View className="flex-row items-center gap-2 mb-4">
              <MaterialIcons name="location-on" size={18} color="#64748B" />
              <Text className="text-slate-500 font-medium">{event.location}</Text>
           </View>

           {/* Stats */}
           <View className="flex-row gap-6 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
               <View>
                   <Text className="text-xl font-bold dark:text-white">{event.attendeesCount}</Text>
                   <Text className="text-slate-500 text-xs uppercase tracking-wider">Going</Text>
               </View>
               <View>
                   <Text className="text-xl font-bold dark:text-white">
                       {event.entryFee && event.entryFee > 0 ? `Kes ${Number(event.entryFee).toFixed(2)}` : 'Free'}
                   </Text>
                   <Text className="text-slate-500 text-xs uppercase tracking-wider">Entry</Text>
               </View>
           </View>

           {/* Description */}
           <View>
              <Text className="text-lg font-bold text-[#111818] dark:text-white mb-3">About Event</Text>
              <Text className="text-slate-600 dark:text-slate-400 leading-relaxed">
                 {event.description}
              </Text>
           </View>

           {/* Organizer */}
           <View className="mt-8 mb-4">
              <Text className="text-lg font-bold text-[#111818] dark:text-white mb-3">Organizer</Text>
              <TouchableOpacity 
                onPress={() => event.organizer?.id && router.push(`/user/${event.organizer.id}` as any)}
                className="flex-row items-center gap-3"
              >
                 <View className="size-10 rounded-full bg-gray-200 items-center justify-center overflow-hidden">
                    {event.organizer?.avatarUrl ? (
                        <Image source={{ uri: event.organizer.avatarUrl }} className="w-full h-full" />
                    ) : (
                        <MaterialIcons name="person" size={20} color="#64748B" />
                    )}
                 </View>
                 <View>
                    <Text className="font-bold dark:text-white">
                        {event.organizerName || event.organizer?.displayName || event.organizer?.username || 'University Central'}
                    </Text>
                    <Text className="text-xs text-slate-500">Event Organizer</Text>
                 </View>
              </TouchableOpacity>
           </View>

           {/* Attendees Section - Only visible to creator */}
           {isCreator && event.rsvps && event.rsvps.length > 0 && (
             <View className="mb-6">
                <Text className="text-lg font-bold text-[#111818] dark:text-white mb-3">
                    {`Attendees (${event.attendeesCount || event.rsvps.length})`}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                   {event.rsvps.slice(0, 20).map((rsvp: any) => (
                      <TouchableOpacity 
                        key={rsvp.user?.id || rsvp.id}
                        onPress={() => rsvp.user?.id && router.push(`/user/${rsvp.user.id}` as any)}
                        className="items-center"
                      >
                         <View className="size-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white dark:border-slate-800">
                            {rsvp.user?.avatarUrl ? (
                               <Image source={{ uri: rsvp.user.avatarUrl }} className="w-full h-full" />
                            ) : (
                               <View className="w-full h-full bg-slate-300 items-center justify-center">
                                  <MaterialIcons name="person" size={20} color="#64748B" />
                               </View>
                            )}
                         </View>
                         <Text className="text-[10px] text-slate-500 mt-1 max-w-[50px]" numberOfLines={1}>
                           {rsvp.user?.username || 'User'}
                         </Text>
                      </TouchableOpacity>
                   ))}
                   {(event.attendeesCount || event.rsvps.length) > 20 && (
                      <View className="size-12 rounded-full bg-[#087d7d]/10 items-center justify-center">
                         <Text className="text-[10px] font-bold text-[#087d7d]">+{(event.attendeesCount || event.rsvps.length) - 20}</Text>
                      </View>
                   )}
                </View>
             </View>
           )}
        </View>
      </ScrollView>

      {/* Footer - Different for creator vs attendee */}
      {isCreator ? (
        <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-white/95 dark:bg-[#1a1a1a]/95 border-t border-gray-100 dark:border-slate-800 shadow-lg">
           <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                 <MaterialIcons name="people" size={24} color="#087d7d" />
                 <Text className="text-lg font-bold dark:text-white">{event.attendeesCount || event.rsvps?.length || 0} Attending</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push(`/events/edit/${eventId}` as any)}
                className="bg-[#087d7d] px-5 py-3 rounded-xl flex-row items-center gap-2"
              >
                 <MaterialIcons name="edit" size={18} color="white" />
                 <Text className="text-white font-bold">Edit Event</Text>
              </TouchableOpacity>
           </View>
        </View>
      ) : (
        <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-white/95 dark:bg-[#1a1a1a]/95 border-t border-gray-100 dark:border-slate-800 shadow-lg">
           <TouchableOpacity 
             className={`w-full rounded-2xl flex-row items-center justify-center py-4 gap-2 active:scale-95 ${isGoing ? 'bg-gray-200 dark:bg-slate-800' : 'bg-[#087d7d]'}`}
             onPress={handleRsvp} 
             disabled={isRsvping}
           >
              {isRsvping ? (
                  <ActivityIndicator color={isGoing ? "#000" : "#FFF"} />
              ) : (
                  <>
                      <MaterialIcons name={isGoing ? "check" : "event-available"} size={22} color={isGoing ? "#111818" : "white"} />
                      <Text className={`font-extrabold text-lg ${isGoing ? 'text-[#111818] dark:text-white' : 'text-white'}`}>
                          {isGoing ? 'You are Going' : 'RSVP Now'}
                      </Text>
                  </>
              )}
           </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
