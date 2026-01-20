import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useStudyHierarchy, School } from '../../../hooks/useStudyHierarchy';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function StudyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { 
    schools, 
    loading, 
    error, 
    fetchSchools, 
    seedData,
  } = useStudyHierarchy();

  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchools();
    setRefreshing(false);
  }, [fetchSchools]);

  const handleSeed = useCallback(async () => {
    try {
      setSeeding(true);
      await seedData();
      await fetchSchools();
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setSeeding(false);
    }
  }, [seedData, fetchSchools]);

  const handleSchoolPress = (school: School) => {
    router.push(`/resources/school/${school.id}`);
  };

  const handleAIPress = () => {
    router.push('/resources/ai-assistant');
  };

  const filteredSchools = searchQuery
    ? schools.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : schools;

  const getIconName = (iconName?: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      flask: 'flask',
      construct: 'construct',
      medkit: 'medkit',
      briefcase: 'briefcase',
      school: 'school',
      'document-text': 'document-text',
      'color-palette': 'color-palette',
    };
    return iconMap[iconName || ''] || 'school';
  };

  const renderSchoolCard = ({ item, index }: { item: School; index: number }) => (
    <TouchableOpacity
      className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm mb-3"
      style={{ width: CARD_WIDTH, height: 180, marginLeft: index % 2 === 0 ? 0 : 8 }}
      onPress={() => handleSchoolPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.bannerUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
      <View className="flex-1 justify-end p-3">
        <View 
          className="w-8 h-8 rounded-lg justify-center items-center mb-2"
          style={{ backgroundColor: item.color || '#6366F1' }}
        >
          <Ionicons name={getIconName(item.iconName)} size={18} color="#fff" />
        </View>
        <Text className="text-sm font-semibold text-white mb-1" numberOfLines={2}>
          {item.name}
        </Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="layers-outline" size={12} color="rgba(255,255,255,0.8)" />
          <Text className="text-[11px] text-white/80">
            {item.yearCount || 0} year{item.yearCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View className="bg-white dark:bg-gray-900 mb-2">
      {/* Search Bar */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 gap-2">
          <Ionicons name="search" size={20} color={isDark ? '#9CA3AF' : '#666'} />
          <TextInput
            className="flex-1 text-[15px] text-gray-900 dark:text-white"
            placeholder="Search schools..."
            placeholderTextColor={isDark ? '#6B7280' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={isDark ? '#6B7280' : '#999'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Banner */}
      <View className="flex-row items-center mx-4 mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl gap-3">
        <View className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 justify-center items-center">
          <Ionicons name="library" size={24} color="#6366F1" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
            Study Materials
          </Text>
          <Text className="text-[13px] text-gray-600 dark:text-gray-400 leading-[18px]">
            Browse by school, course, and unit to find resources
          </Text>
        </View>
      </View>

      {/* Section Title */}
      <View className="flex-row justify-between items-center px-4 pb-3">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Schools & Faculties
        </Text>
        <Text className="text-[13px] text-gray-500 dark:text-gray-400">
          {schools.length} available
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-10 pt-16">
      <View className="w-28 h-28 rounded-full bg-indigo-50 dark:bg-indigo-900/20 justify-center items-center mb-6">
        <Ionicons name="school-outline" size={56} color="#6366F1" />
      </View>
      <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Schools Available
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center leading-5">
        Schools will appear here once they're set up by administrators.
      </Text>
      {__DEV__ && (
        <TouchableOpacity 
          className="mt-6 flex-row items-center bg-indigo-500 px-5 py-3 rounded-xl gap-2"
          onPress={handleSeed}
          disabled={seeding}
        >
          {seeding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text className="text-white font-semibold text-sm">Seed Sample Data</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#0f1419]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Study</Text>
          <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Find study materials</Text>
        </View>
        <TouchableOpacity 
          className="flex-row items-center bg-indigo-500 px-4 py-2.5 rounded-full gap-1.5"
          onPress={() => router.push('/resources/upload')}
        >
          <Ionicons name="cloud-upload" size={18} color="#fff" />
          <Text className="text-white font-semibold text-sm">Upload</Text>
        </TouchableOpacity>
      </View>

      {loading && schools.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading schools...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">{error}</Text>
          <TouchableOpacity 
            className="mt-4 px-6 py-3 bg-indigo-500 rounded-lg"
            onPress={handleRefresh}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSchools}
          keyExtractor={(item) => item.id}
          renderItem={renderSchoolCard}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']} 
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* AI Floating Button */}
      <TouchableOpacity 
        className="absolute bottom-24 right-4 rounded-full overflow-hidden shadow-lg"
        style={{ shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}
        onPress={handleAIPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          className="flex-row items-center px-5 py-3.5 gap-2"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
          <Text className="text-white font-semibold text-base">Ask AI</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
