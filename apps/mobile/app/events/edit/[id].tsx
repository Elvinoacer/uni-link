import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEvent, useUpdateEvent, useDeleteEvent } from '../../../hooks/useEvents';
import { Button } from '../../../components/ui/Button';

const CATEGORIES = [
  { id: 'social', label: 'Social', icon: 'celebration', color: '#8B5CF6' },
  { id: 'academic', label: 'Academic', icon: 'school', color: '#3B82F6' },
  { id: 'sports', label: 'Sports', icon: 'fitness-center', color: '#10B981' },
  { id: 'club', label: 'Club', icon: 'groups', color: '#EC4899' },
  { id: 'other', label: 'Other', icon: 'interests', color: '#6B7280' },
];

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const eventId = typeof id === 'string' ? id : id[0];

  const { data: event, isLoading: isLoadingEvent } = useEvent(eventId);
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateEvent();
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [image, setImage] = useState<string | null>(null);

  // Pre-fill data
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setLocation(event.location);
      setCategory(event.category || 'other');
      setImage(event.image || null);
      
      const eventDate = new Date(event.startsAt);
      if (!isNaN(eventDate.getTime())) {
          setDate(eventDate.toISOString().split('T')[0]);
          setTime(eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      }
    }
  }, [event]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = () => {
    if (!title || !description || !location || !date || !time) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    // Basic date reconstruction
    // In real app, parse date + time correctly
    const startsAt = new Date().toISOString(); 

    updateEvent({
      id: eventId,
      data: {
        title,
        description,
        location,
        startsAt, 
        category,
        image, // If changed
      }
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'Event updated successfully!', [
           { text: 'OK', onPress: () => router.back() }
        ]);
      },
      onError: () => {
        Alert.alert('Error', 'Failed to update event.');
      }
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: () => {
          deleteEvent(eventId, {
            onSuccess: () => {
               // router.dismissAll(); // simplistic
               router.replace('/(tabs)/events');
            },
            onError: () => {
               Alert.alert('Error', 'Failed to delete event.');
            }
          });
        }
      }
    ]);
  };

  if (isLoadingEvent) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#171f26]">
        <ActivityIndicator color="#087d7d" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26]">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <MaterialIcons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-lg font-bold dark:text-white">Edit Event</Text>
        <TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
           <Text className="text-red-500 font-bold">Delete</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          
          {/* Image Picker */}
          <TouchableOpacity 
            onPress={pickImage}
            className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6 overflow-hidden items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700"
          >
            {image ? (
              <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="items-center gap-2">
                <MaterialIcons name="add-photo-alternate" size={40} color="#9CA3AF" />
                <Text className="text-gray-400 font-medium">Add Cover Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View className="space-y-6 gap-5">
            <View>
              <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Event Title</Text>
              <TextInput 
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Coding Workshop 2024"
                placeholderTextColor="#9CA3AF"
                className="text-2xl font-bold text-black dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2"
              />
            </View>

            <View>
               <Text className="text-xs font-bold text-gray-500 uppercase mb-3">Category</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                 <View className="flex-row gap-3">
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity 
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        className={`flex-row items-center gap-2 px-4 py-2 rounded-full border ${category === cat.id ? 'bg-primary/10 border-primary' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                      >
                         <MaterialIcons name={cat.icon as any} size={18} color={category === cat.id ? cat.color : '#9CA3AF'} />
                         <Text className={`font-semibold ${category === cat.id ? 'text-primary' : 'text-gray-500'}`}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                 </View>
               </ScrollView>
            </View>

            <View className="flex-row gap-4">
               <View className="flex-1">
                 <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Date</Text>
                 <View className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                    <MaterialIcons name="calendar-today" size={20} color="#6B7280" />
                    <TextInput 
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 text-base text-black dark:text-white"
                    />
                 </View>
               </View>
               <View className="flex-1">
                 <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Time</Text>
                 <View className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                    <MaterialIcons name="access-time" size={20} color="#6B7280" />
                    <TextInput 
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 text-base text-black dark:text-white"
                    />
                 </View>
               </View>
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Location</Text>
              <View className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                 <MaterialIcons name="location-on" size={20} color="#6B7280" />
                 <TextInput 
                   value={location}
                   onChangeText={setLocation}
                   placeholder="Ex: Student Center, Room 302"
                   placeholderTextColor="#9CA3AF"
                   className="flex-1 text-base text-black dark:text-white"
                 />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Description</Text>
               <TextInput 
                 value={description}
                 onChangeText={setDescription}
                 placeholder="Tell people what your event is about..."
                 placeholderTextColor="#9CA3AF"
                 multiline
                 numberOfLines={6}
                 textAlignVertical="top"
                 className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-base text-black dark:text-white min-h-[120px]"
               />
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#171f26]">
        <Button 
          title="Save Changes" 
          onPress={handleUpdate} 
          isLoading={isUpdating}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
