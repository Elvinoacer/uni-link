import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useStudyHierarchy, Course } from '../../../hooks/useStudyHierarchy';

export default function SchoolDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    selectedSchool, 
    courses,
    loading, 
    fetchSchool,
    createCourse,
  } = useStudyHierarchy();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSchool(id);
    }
  }, [id, fetchSchool]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchSchool(id);
    }
    setRefreshing(false);
  };

  const handleCoursePress = (course: Course) => {
    router.push(`/resources/course/${course.id}`);
  };

  const handleCreateCourse = async () => {
    if (!newCourseCode.trim() || !newCourseName.trim() || !id) return;
    
    try {
      setCreating(true);
      const newCourse = await createCourse({
        schoolId: id,
        code: newCourseCode.trim().toUpperCase(),
        name: newCourseName.trim(),
        description: newCourseDescription.trim() || undefined,
      });
      setShowCreateCourse(false);
      setNewCourseCode('');
      setNewCourseName('');
      setNewCourseDescription('');
      await fetchSchool(id);
      
      if (newCourse?.id) {
        router.push(`/resources/course/${newCourse.id}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const handleAIPress = () => {
    router.push({
      pathname: '/resources/ai-assistant',
      params: { schoolId: id, schoolName: selectedSchool?.name }
    });
  };

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl mb-2.5 shadow-sm"
      onPress={() => handleCoursePress(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="w-11 h-11 rounded-xl justify-center items-center mr-3"
          style={{ backgroundColor: selectedSchool?.color || '#6366F1' }}
        >
          <Ionicons name="book" size={20} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5">
            {item.code}
          </Text>
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-0.5" numberOfLines={2}>
            {item.name}
          </Text>
          {item.description && (
            <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="items-center bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 rounded-lg">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-200">{item.yearCount || 0}</Text>
          <Text className="text-[10px] text-gray-500 dark:text-gray-400">years</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#ccc'} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View className="items-center py-16">
      <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 justify-center items-center mb-4">
        <Ionicons name="book-outline" size={40} color={isDark ? '#6B7280' : '#ccc'} />
      </View>
      <Text className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No Courses Yet</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center px-10 mb-5">
        Can't find your course? Add it to get started!
      </Text>
      <TouchableOpacity 
        className="flex-row items-center px-5 py-3 rounded-xl gap-2"
        style={{ backgroundColor: selectedSchool?.color || '#6366F1' }}
        onPress={() => setShowCreateCourse(true)}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text className="text-white font-semibold text-sm">Add Course</Text>
      </TouchableOpacity>
    </View>
  );

  if (!selectedSchool && loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#0f1419]">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#0f1419]" edges={['top']}>
      {/* Hero Banner */}
      <View className="h-[200px] relative">
        <Image
          source={{ uri: selectedSchool?.bannerUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <TouchableOpacity 
          className="absolute top-3 left-4 w-10 h-10 rounded-full bg-black/30 justify-center items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="absolute bottom-0 left-0 right-0 p-4">
          <View 
            className="w-11 h-11 rounded-xl justify-center items-center mb-2"
            style={{ backgroundColor: selectedSchool?.color || '#6366F1' }}
          >
            <Ionicons name="school" size={24} color="#fff" />
          </View>
          <Text className="text-[22px] font-bold text-white mb-1">{selectedSchool?.name}</Text>
          {selectedSchool?.description && (
            <Text className="text-[13px] text-white/80">{selectedSchool.description}</Text>
          )}
        </View>
      </View>

      {/* Section Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white dark:bg-gray-900">
        <Text className="text-[17px] font-semibold text-gray-900 dark:text-white">Courses</Text>
        <TouchableOpacity 
          className="flex-row items-center gap-1"
          onPress={() => setShowCreateCourse(true)}
        >
          <Ionicons name="add" size={18} color="#6366F1" />
          <Text className="text-sm text-indigo-500 font-semibold">Add Course</Text>
        </TouchableOpacity>
      </View>

      {/* Courses List */}
      {loading && courses.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#6366F1" />
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading courses...</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Course Modal */}
      <Modal
        visible={showCreateCourse}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateCourse(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">Add New Course</Text>
              <TouchableOpacity onPress={() => setShowCreateCourse(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#333'} />
              </TouchableOpacity>
            </View>
            
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Course Code *</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 dark:text-white mb-4"
                placeholder="e.g., CS (Computer Science)"
                value={newCourseCode}
                onChangeText={setNewCourseCode}
                autoCapitalize="characters"
                placeholderTextColor={isDark ? '#6B7280' : '#999'}
              />
              
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Course Name *</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 dark:text-white mb-4"
                placeholder="e.g., Computer Science"
                value={newCourseName}
                onChangeText={setNewCourseName}
                placeholderTextColor={isDark ? '#6B7280' : '#999'}
              />
              
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 dark:text-white h-20 mb-4"
                placeholder="Brief description of this course"
                value={newCourseDescription}
                onChangeText={setNewCourseDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor={isDark ? '#6B7280' : '#999'}
                style={{ textAlignVertical: 'top' }}
              />

              <View className="flex-row items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                <Ionicons name="information-circle" size={16} color="#6366F1" />
                <Text className="text-[13px] text-gray-600 dark:text-gray-400 flex-1">
                  Years 1-4 will be auto-created for the course
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              className={`rounded-xl py-4 items-center ${(!newCourseCode.trim() || !newCourseName.trim()) ? 'opacity-50' : ''}`}
              style={{ backgroundColor: selectedSchool?.color || '#6366F1' }}
              onPress={handleCreateCourse}
              disabled={!newCourseCode.trim() || !newCourseName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">Create Course</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Floating Button */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 rounded-full overflow-hidden shadow-lg"
        style={{ shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}
        onPress={handleAIPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          className="p-3.5"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
