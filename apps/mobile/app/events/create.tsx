import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCreateEvent } from '../../hooks/useEvents';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import { Button } from '../../components/ui/Button';

const CATEGORIES = [
  { id: 'social', label: 'Social', icon: 'celebration', color: '#8B5CF6' },
  { id: 'academic', label: 'Academic', icon: 'school', color: '#3B82F6' },
  { id: 'sports', label: 'Sports', icon: 'fitness-center', color: '#10B981' },
  { id: 'club', label: 'Club', icon: 'groups', color: '#EC4899' },
  { id: 'other', label: 'Other', icon: 'interests', color: '#6B7280' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { mutate: createEvent, isPending: isCreating } = useCreateEvent();
  const { uploadFiles, isUploading } = useMediaUpload();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [images, setImages] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [entryFee, setEntryFee] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  
  // Date Time State
  const [startsAt, setStartsAt] = useState(new Date());
  const [endsAt, setEndsAt] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)); // Default 2 hours
  
  // Picker State
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      // Removed quality: 0.8 to ensure instant preview (compression moved to upload)
    });

    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newUris]);
      setSelectedAssets(prev => [...prev, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setSelectedAssets(prev => prev.filter((_, i) => i !== index));
  };

  const showPicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    setActivePicker(type);
    setPickerMode(mode);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
        setActivePicker(null);
    }
    
    if (selectedDate) {
      if (activePicker === 'start') {
         setStartsAt(selectedDate);
         // Auto-adjust end date if start is after end
         if (selectedDate > endsAt) {
             setEndsAt(new Date(selectedDate.getTime() + 2 * 60 * 60 * 1000));
         }
      } else {
         if (selectedDate < startsAt) {
             Alert.alert('Invalid Date', 'End time cannot be before start time.');
             return;
         }
         setEndsAt(selectedDate);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !location) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    let finalImages: string[] = [];

    // Upload local assets
    if (selectedAssets.length > 0) {
        try {
            console.log('Uploading images...', selectedAssets.length);
            const uploadedFiles = await uploadFiles(selectedAssets);
            if (uploadedFiles && uploadedFiles.length > 0) {
                finalImages = uploadedFiles.map(f => f.url);
                console.log('Images uploaded successfully');
            } else {
                // If we selected assets but got no uploaded files, it's a failure (even if no error thrown)
                console.error('Upload returned no files');
                Alert.alert('Upload Error', 'Failed to upload event images. No files returned.');
                return;
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            Alert.alert('Upload Error', 'Failed to upload event images. Please try again.');
            return;
        }
    }

    // Default image if none selected
    if (finalImages.length === 0) {
        finalImages = ['https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800'];
    }

    const payload = {
      title,
      description,
      location,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      category,
      imageUrl: finalImages[0], // Main image
      images: finalImages, // All images
      entryFee: entryFee ? parseFloat(entryFee) : 0,
      organizerName: organizerName || undefined,
    };

    console.log("Sending Event Payload:", payload);

    createEvent(payload, {
      onSuccess: () => {
        Alert.alert('Success', 'Event created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      },
      onError: (error: any) => {
        console.error("Create Event Failed:", error);
        const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error.message || 'Unknown error';
        Alert.alert('Error', `Failed to create event: ${errorMessage}`);
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26]">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-lg font-bold dark:text-white">Host Event</Text>
        <View className="size-10" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          
          {/* Image Picker */}
          <View className="mb-6">
              {images.length === 0 ? (
                  <TouchableOpacity 
                    onPress={pickImage}
                    className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <View className="items-center gap-2">
                      <MaterialIcons name="add-photo-alternate" size={40} color="#9CA3AF" />
                      <Text className="text-gray-400 font-medium">Add Photos</Text>
                    </View>
                  </TouchableOpacity>
              ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                      <View className="flex-row gap-3">
                          {images.map((img, index) => (
                              <View key={index} className="relative w-40 h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                  <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
                                  <TouchableOpacity 
                                      onPress={() => removeImage(index)}
                                      className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
                                  >
                                      <MaterialIcons name="close" size={16} color="white" />
                                  </TouchableOpacity>
                              </View>
                          ))}
                          <TouchableOpacity 
                             onPress={pickImage}
                             className="w-40 h-40 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 items-center justify-center"
                          >
                             <MaterialIcons name="add" size={32} color="#9CA3AF" />
                             <Text className="text-xs text-gray-400 mt-1">Add More</Text>
                          </TouchableOpacity>
                      </View>
                  </ScrollView>
              )}
          </View>

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

            {/* Date & Time Selection */}
            <View className="flex-row gap-4">
               {/* Starts At */}
               <View className="flex-1 gap-2">
                 <Text className="text-xs font-bold text-gray-500 uppercase">Starts</Text>
                 <TouchableOpacity onPress={() => showPicker('start', 'date')} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                    <MaterialIcons name="calendar-today" size={20} color="#6B7280" />
                    <Text className="text-black dark:text-white">{startsAt.toLocaleDateString()}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => showPicker('start', 'time')} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                    <MaterialIcons name="access-time" size={20} color="#6B7280" />
                    <Text className="text-black dark:text-white">{startsAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                 </TouchableOpacity>
               </View>

               {/* Ends At */}
               <View className="flex-1 gap-2">
                 <Text className="text-xs font-bold text-gray-500 uppercase">Ends</Text>
                 <TouchableOpacity onPress={() => showPicker('end', 'date')} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                    <MaterialIcons name="event" size={20} color="#6B7280" />
                    <Text className="text-black dark:text-white">{endsAt.toLocaleDateString()}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => showPicker('end', 'time')} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                    <MaterialIcons name="schedule" size={20} color="#6B7280" />
                    <Text className="text-black dark:text-white">{endsAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                 </TouchableOpacity>
               </View>
            </View>

            {/* Hidden Picker Components (visible when active) */}
            {activePicker && (Platform.OS === 'ios' ? (
                // iOS logic: usually in a modal or inline. For simplicity here inline but likely needs better UX.
                // Or standard DateTimePicker visible
                <View className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                  <Text className="text-center font-bold mb-2 dark:text-white">Select {activePicker === 'start' ? 'Start' : 'End'} {pickerMode}</Text>
                  <DateTimePicker
                    value={activePicker === 'start' ? startsAt : endsAt}
                    mode={pickerMode}
                    display="spinner"
                    onChange={handleDateChange}
                    textColor={Platform.OS === 'ios' ? '#000000' : undefined} 
                  />
                   <Button title="Done" onPress={() => setActivePicker(null)} size="sm" />
                </View>
            ) : (
                <DateTimePicker
                    value={activePicker === 'start' ? startsAt : endsAt}
                    mode={pickerMode}
                    display="default"
                    onChange={handleDateChange}
                />
            ))}

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

            <View className="flex-row gap-4">
               <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Entry Fee (Kes)</Text>
                  <View className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                     <MaterialIcons name="attach-money" size={20} color="#6B7280" />
                     <TextInput 
                       value={entryFee}
                       onChangeText={setEntryFee}
                       placeholder="0.00"
                       keyboardType="numeric"
                       placeholderTextColor="#9CA3AF"
                       className="flex-1 text-base text-black dark:text-white"
                     />
                  </View>
               </View>

               <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Organizer</Text>
                  <View className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex-row items-center gap-2">
                     <MaterialIcons name="person" size={20} color="#6B7280" />
                     <TextInput 
                       value={organizerName}
                       onChangeText={setOrganizerName}
                       placeholder="Optional"
                       placeholderTextColor="#9CA3AF"
                       className="flex-1 text-base text-black dark:text-white"
                     />
                  </View>
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
          title="Create Event" 
          onPress={handleSubmit} 
          isLoading={isCreating || isUploading}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
