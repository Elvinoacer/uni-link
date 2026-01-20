import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 200;
const AUTO_SWIPE_INTERVAL = 5000; // 5 seconds

interface BannerEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  image?: string;
  imageUrl?: string;
  location: string;
}

interface EventBannerCarouselProps {
  events: BannerEvent[];
  maxEvents?: number;
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const dayName = days[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return { dayName, month, day, time, fullDate: `${dayName}, ${month} ${day}` };
}

export function EventBannerCarousel({ events, maxEvents = 10 }: EventBannerCarouselProps) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Take up to maxEvents
  const displayEvents = events.slice(0, maxEvents);
  
  // Auto-swipe effect
  useEffect(() => {
    if (displayEvents.length <= 1) return;
    
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % displayEvents.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, AUTO_SWIPE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [currentIndex, displayEvents.length]);
  
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }, []);
  
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  
  if (displayEvents.length === 0) {
    return (
      <View 
        style={{ width: SCREEN_WIDTH - 32, height: BANNER_HEIGHT }} 
        className="bg-slate-200 dark:bg-slate-700 rounded-xl items-center justify-center mx-4"
      >
        <MaterialIcons name="event" size={48} color="#94A3B8" />
        <Text className="text-gray-500 mt-2">No upcoming events</Text>
      </View>
    );
  }
  
  const renderItem = ({ item }: { item: BannerEvent }) => {
    const start = formatDateTime(item.startsAt);
    const end = formatDateTime(item.endsAt);
    const eventImage = item.imageUrl || item.image || 'https://images.unsplash.com/photo-1555696958-c5049b866f6f?w=800&fit=crop';
    
    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => router.push(`/events/${item.id}` as any)}
        style={{ width: SCREEN_WIDTH - 32 }}
      >
        <ImageBackground 
          source={{ uri: eventImage }} 
          style={{ height: BANNER_HEIGHT }}
          className="rounded-xl overflow-hidden"
          imageStyle={{ borderRadius: 12 }}
        >
          {/* Dark overlay for text readability */}
          <View
            style={{ flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            {/* Event Title */}
            <Text 
              className="text-white text-lg font-bold mb-2" 
              numberOfLines={2}
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
            >
              {item.title}
            </Text>
            
            {/* Date/Time Row */}
            <View className="flex-row items-center gap-4">
              {/* Start Time */}
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons name="schedule" size={14} color="#87CEEB" />
                <Text 
                  className="text-white/90 text-xs font-medium"
                  style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
                >
                  {start.fullDate} • {start.time}
                </Text>
              </View>
              
              {/* End Time */}
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons name="arrow-forward" size={12} color="#87CEEB" />
                <Text 
                  className="text-white/80 text-xs"
                  style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
                >
                  {end.time}
                </Text>
              </View>
            </View>
            
            {/* Location */}
            <View className="flex-row items-center gap-1.5 mt-1">
              <MaterialIcons name="location-on" size={14} color="#FFD700" />
              <Text 
                className="text-white/80 text-xs" 
                numberOfLines={1}
                style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
              >
                {item.location}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };
  
  return (
    <View className="px-4">
      <FlatList
        ref={flatListRef}
        data={displayEvents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH - 32}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH - 32,
          offset: (SCREEN_WIDTH - 32) * index,
          index,
        })}
      />
      
      {/* Pagination Dots */}
      {displayEvents.length > 1 && (
        <View className="flex-row justify-center mt-3 gap-1.5">
          {displayEvents.map((_, index) => (
            <View 
              key={index}
              className={`h-1.5 rounded-full ${
                index === currentIndex 
                  ? 'w-4 bg-[#087d7d]' 
                  : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
