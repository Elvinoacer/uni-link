import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, useColorScheme } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarketplaceService } from '../../services/marketplace.service';
import { useCategories, useCreateListing } from '../../hooks/useMarketplace';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const LOCATION_SUGGESTIONS = [
  'Library',
  'Student Center',
  'Dining Hall',
  'Dorm Lobby',
  'Campus Center',
  'Gym Entrance',
];

export default function CreateListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { categoryName } = useLocalSearchParams<{ categoryName: string }>();
  
  const { data: categories } = useCategories();
  const createMutation = useCreateListing();
  
  const [isbn, setIsbn] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [showIsbnSection, setShowIsbnSection] = useState(false);
  
  const [form, setForm] = useState({
      title: '',
      description: '',
      price: '',
      category: '',
      condition: 'good',
      location: '',
      images: [] as string[]
  });

  // Auto-select category from params
  React.useEffect(() => {
    if (categoryName && categories) {
       const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
       if (cat) {
           setForm(prev => {
                // Ensure we don't reset if already set manually (unless it's the initial mount)
                if (prev.category) return prev; 
                return { ...prev, category: cat.id };
           });
       }
    }
  }, [categoryName, categories]);

  // Auto-show ISBN section when Textbooks category is selected
  React.useEffect(() => {
    const textbooksCategory = categories?.find(c => c.name.toLowerCase() === 'textbooks');
    if (form.category === textbooksCategory?.id) {
      setShowIsbnSection(true);
    }
  }, [form.category, categories]);

  const handleLookup = async () => {
      if (!isbn) return;
      setLookingUp(true);
      try {
          const res = await MarketplaceService.lookupISBN(isbn);
          if (res.success && res.data) {
              const book = res.data;
              const textbooksCategory = categories?.find(c => c.name.toLowerCase() === 'textbooks');
              setForm(prev => ({
                  ...prev,
                  title: book.title || prev.title,
                  description: book.description || prev.description,
                  images: book.thumbnail ? [book.thumbnail] : prev.images,
                  category: textbooksCategory?.id || prev.category
              }));
              Alert.alert('Book Found', `Filled details for "${book.title}"`);
          } else {
              Alert.alert('Not Found', 'Could not find book with that ISBN.');
          }
      } catch (error) {
          Alert.alert('Error', 'Failed to lookup ISBN.');
      } finally {
          setLookingUp(false);
      }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 5) // Max 5 images
      }));
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price) {
        Alert.alert('Error', 'Please fill in title and price.');
        return;
    }
    if (form.title.length < 5) {
        Alert.alert('Error', 'Title must be at least 5 characters.');
        return;
    }
    if (!form.category) {
        Alert.alert('Error', 'Please select a category.');
        return;
    }
    
    createMutation.mutate({
        ...form,
        price: parseFloat(form.price),
        category: form.category,
        condition: form.condition,
        location: form.location || undefined,
        images: form.images.length > 0 ? form.images : undefined
    }, {
        onSuccess: () => {
            Alert.alert('Success', 'Listing created!');
            router.back();
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || error.message || 'Failed to create listing';
            Alert.alert('Error', typeof msg === 'object' ? JSON.stringify(msg) : msg);
        }
    });
  };

  return (
    <View className="flex-1 bg-white dark:bg-[#171f26]" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={isDark ? '#fff' : '#111'} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#111818] dark:text-white">Create Listing</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Category Selection - First */}
        <View className="mb-6">
            <Text className="mb-2 text-gray-600 dark:text-gray-400 font-bold text-sm">Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {(categories || []).map(cat => (
                    <TouchableOpacity 
                        key={cat.id}
                        onPress={() => setForm({...form, category: cat.id})}
                        className={`px-4 py-2.5 rounded-full mr-2 border ${form.category === cat.id ? 'bg-[#1990e6] border-[#1990e6]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
                    >
                        <Text className={`font-bold ${form.category === cat.id ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* ISBN Section - Collapsible, shown for Textbooks */}
        {showIsbnSection && (
          <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6 border border-blue-100 dark:border-blue-800">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-bold text-blue-800 dark:text-blue-300">📚 Textbook? Scan ISBN</Text>
                <TouchableOpacity onPress={() => setShowIsbnSection(false)}>
                  <MaterialIcons name="close" size={18} color={isDark ? '#93c5fd' : '#1e40af'} />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
                  <TextInput 
                      className="flex-1 bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-[#111818] dark:text-white"
                      placeholder="Enter ISBN (e.g. 978...)"
                      placeholderTextColor="#9CA3AF"
                      value={isbn}
                      onChangeText={setIsbn}
                      keyboardType="numeric"
                  />
                  <TouchableOpacity 
                      onPress={handleLookup}
                      disabled={lookingUp}
                      className="bg-[#1990e6] px-4 justify-center rounded-lg"
                  >
                      {lookingUp ? <ActivityIndicator color="white" /> : <MaterialIcons name="search" size={24} color="white" />}
                  </TouchableOpacity>
              </View>
          </View>
        )}

        {/* Images Section */}
        <View className="mb-6">
            <Text className="mb-2 text-gray-600 dark:text-gray-400 font-bold text-sm">Photos</Text>
            <View className="flex-row flex-wrap gap-2">
                {form.images.map((uri, index) => (
                    <View key={index} className="relative">
                        <Image source={{ uri }} className="w-20 h-20 rounded-xl bg-gray-200" />
                        <TouchableOpacity 
                            onPress={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        >
                            <MaterialIcons name="close" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
                {form.images.length < 5 && (
                    <TouchableOpacity 
                        onPress={pickImage}
                        className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 items-center justify-center"
                    >
                        <MaterialIcons name="add-a-photo" size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
                    </TouchableOpacity>
                )}
            </View>
            <Text className="text-xs text-gray-400 mt-2">Add up to 5 photos</Text>
        </View>

        {/* Title */}
        <View className="mb-4">
            <Text className="mb-1 text-gray-600 dark:text-gray-400 font-bold text-sm">Title *</Text>
            <TextInput 
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-[#111818] dark:text-white"
                placeholder="What are you selling?"
                placeholderTextColor="#9CA3AF"
                value={form.title}
                onChangeText={t => setForm({...form, title: t})}
            />
        </View>

        {/* Price */}
        <View className="mb-4">
            <Text className="mb-1 text-gray-600 dark:text-gray-400 font-bold text-sm">Price (Kes) *</Text>
            <TextInput 
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-[#111818] dark:text-white"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={form.price}
                onChangeText={t => setForm({...form, price: t})}
            />
        </View>

        {/* Condition */}
        <View className="mb-4">
            <Text className="mb-2 text-gray-600 dark:text-gray-400 font-bold text-sm">Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {['new', 'like-new', 'good', 'fair', 'poor'].map(cond => (
                    <TouchableOpacity 
                        key={cond}
                        onPress={() => setForm({...form, condition: cond})}
                        className={`px-4 py-2 rounded-full mr-2 border ${form.condition === cond ? 'bg-[#1990e6] border-[#1990e6]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
                    >
                        <Text className={`font-bold capitalize ${form.condition === cond ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                            {cond.replace('-', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Location */}
        <View className="mb-4">
            <Text className="mb-1 text-gray-600 dark:text-gray-400 font-bold text-sm">Pickup Location</Text>
            <TextInput 
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-[#111818] dark:text-white mb-2"
                placeholder="Where can buyers pick up?"
                placeholderTextColor="#9CA3AF"
                value={form.location}
                onChangeText={t => setForm({...form, location: t})}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {LOCATION_SUGGESTIONS.map(loc => (
                    <TouchableOpacity 
                        key={loc}
                        onPress={() => setForm({...form, location: loc})}
                        className={`px-3 py-1.5 rounded-full mr-2 ${form.location === loc ? 'bg-gray-800 dark:bg-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                        <Text className={`text-xs font-medium ${form.location === loc ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-300'}`}>
                            {loc}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Description */}
        <View className="mb-6">
            <Text className="mb-1 text-gray-600 dark:text-gray-400 font-bold text-sm">Description</Text>
            <TextInput 
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-[#111818] dark:text-white min-h-[100px]"
                placeholder="Describe condition, details, why you're selling..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={form.description}
                onChangeText={t => setForm({...form, description: t})}
            />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            className={`p-4 rounded-xl items-center ${createMutation.isPending ? 'bg-gray-400' : 'bg-[#1990e6]'}`}
        >
            {createMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Post Listing</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
