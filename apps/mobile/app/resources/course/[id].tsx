import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useStudyHierarchy, Course, YearOfStudy, Unit } from '../../../hooks/useStudyHierarchy';

export default function CourseDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    fetchCourse,
    fetchYear,
    createUnit,
    selectedCourse,
    years,
    units,
    loading,
  } = useStudyHierarchy();

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDescription, setNewUnitDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourse(id);
    }
  }, [id, fetchCourse]);

  useEffect(() => {
    // Auto-select first year when course loads
    if (years.length > 0 && !selectedYearId) {
      setSelectedYearId(years[0].id);
    }
  }, [years, selectedYearId]);

  useEffect(() => {
    if (selectedYearId) {
      fetchYear(selectedYearId);
    }
  }, [selectedYearId, fetchYear]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (id) {
      await fetchCourse(id);
      if (selectedYearId) {
        await fetchYear(selectedYearId);
      }
    }
    setRefreshing(false);
  }, [id, selectedYearId]);

  const handleUnitPress = (unit: Unit) => {
    router.push(`/resources/unit/${unit.id}`);
  };

  const handleCreateUnit = async () => {
    if (!newUnitCode.trim() || !newUnitName.trim() || !selectedYearId) return;
    
    try {
      setCreating(true);
      await createUnit({
        yearOfStudyId: selectedYearId,
        code: newUnitCode.trim().toUpperCase(),
        name: newUnitName.trim(),
        description: newUnitDescription.trim() || undefined,
      });
      setShowCreateUnit(false);
      setNewUnitCode('');
      setNewUnitName('');
      setNewUnitDescription('');
      await fetchYear(selectedYearId);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create unit');
    } finally {
      setCreating(false);
    }
  };

  const handleAIPress = () => {
    router.push({
      pathname: '/resources/ai-assistant',
      params: { courseId: id, courseName: selectedCourse?.name, courseCode: selectedCourse?.code }
    });
  };

  const renderYearTab = (year: YearOfStudy) => (
    <TouchableOpacity
      key={year.id}
      style={[
        styles.yearTab,
        selectedYearId === year.id && styles.yearTabActive,
        { backgroundColor: selectedYearId === year.id ? (selectedCourse?.school?.color || '#6366F1') : 'transparent' }
      ]}
      onPress={() => setSelectedYearId(year.id)}
    >
      <Text 
        style={[
          styles.yearTabText,
          selectedYearId === year.id && styles.yearTabTextActive
        ]}
      >
        Year {year.year}
      </Text>
      {year.unitCount > 0 && (
        <View style={[styles.yearBadge, selectedYearId === year.id && styles.yearBadgeActive]}>
          <Text style={[styles.yearBadgeText, selectedYearId === year.id && styles.yearBadgeTextActive]}>
            {year.unitCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderUnitCard = ({ item, index }: { item: Unit; index: number }) => (
    <TouchableOpacity
      style={styles.unitCard}
      onPress={() => handleUnitPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.unitLeft}>
        <View style={[styles.unitNumber, { backgroundColor: selectedCourse?.school?.color || '#6366F1' }]}>
          <Text style={styles.unitNumberText}>{item.code}</Text>
        </View>
        <View style={styles.unitInfo}>
          <Text style={styles.unitName} numberOfLines={2}>{item.name}</Text>
          {item.professorName && (
            <Text style={styles.unitProfessor}>{item.professorName}</Text>
          )}
          {item.creditHours && (
            <Text style={styles.unitCredits}>{item.creditHours} credits</Text>
          )}
        </View>
      </View>
      <View style={styles.unitRight}>
        <View style={styles.resourceBadge}>
          <Ionicons name="document-text-outline" size={14} color="#666" />
          <Text style={styles.resourceCount}>{item.resourceCount || 0}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="folder-open-outline" size={48} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>No Units Yet</Text>
      <Text style={styles.emptySubtitle}>
        Add units (like CSC 311) to organize resources for this year
      </Text>
      <TouchableOpacity 
        style={[styles.createFirstButton, { backgroundColor: selectedCourse?.school?.color || '#6366F1' }]}
        onPress={() => setShowCreateUnit(true)}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createFirstText}>Add Unit</Text>
      </TouchableOpacity>
    </View>
  );

  if (!selectedCourse && loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f1419' : '#f5f5f5' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  const schoolColor = selectedCourse?.school?.color || '#6366F1';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f1419' : '#f5f5f5' }]} edges={['top']}>
      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <Image
          source={{ uri: selectedCourse?.bannerUrl || selectedCourse?.school?.bannerUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800' }}
          style={styles.heroImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.heroGradient}
        />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={[styles.codeBadge, { backgroundColor: schoolColor }]}>
            <Text style={styles.codeText}>{selectedCourse?.code}</Text>
          </View>
          <Text style={styles.courseName}>{selectedCourse?.name}</Text>
          <View style={styles.courseMeta}>
            <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.courseMetaText}>
              {selectedCourse?.school?.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Year Tabs */}
      <View style={styles.yearTabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearTabsContent}
        >
          {years.map(renderYearTab)}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Units</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateUnit(true)}
        >
          <Ionicons name="add" size={20} color="#6366F1" />
          <Text style={styles.addButtonText}>Add Unit</Text>
        </TouchableOpacity>
      </View>

      {/* Units List */}
      <FlatList
        data={units}
        keyExtractor={(item) => item.id}
        renderItem={renderUnitCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Unit Modal */}
      <Modal
        visible={showCreateUnit}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateUnit(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Unit</Text>
              <TouchableOpacity onPress={() => setShowCreateUnit(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Unit Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., CSC 311"
                value={newUnitCode}
                onChangeText={setNewUnitCode}
                autoCapitalize="characters"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Unit Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Data Structures and Algorithms"
                value={newUnitName}
                onChangeText={setNewUnitName}
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of this unit"
                value={newUnitDescription}
                onChangeText={setNewUnitDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />

              <View style={styles.yearInfo}>
                <Ionicons name="calendar" size={16} color="#666" />
                <Text style={styles.yearInfoText}>
                  Adding to: {years.find(y => y.id === selectedYearId)?.name || 'Year 1'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.createButton,
                { backgroundColor: schoolColor },
                (!newUnitCode.trim() || !newUnitName.trim()) && styles.createButtonDisabled
              ]}
              onPress={handleCreateUnit}
              disabled={!newUnitCode.trim() || !newUnitName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Unit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Floating Button */}
      <TouchableOpacity 
        style={styles.aiButton}
        onPress={handleAIPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.aiButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Will be overridden inline
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroHeader: {
    height: 180,
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  codeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courseMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  yearTabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  yearTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  yearTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    gap: 6,
  },
  yearTabActive: {
    borderColor: 'transparent',
  },
  yearTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  yearTabTextActive: {
    color: '#fff',
  },
  yearBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  yearBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  yearBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  yearBadgeTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  unitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unitNumber: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  unitNumberText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  unitProfessor: {
    fontSize: 12,
    color: '#666',
  },
  unitCredits: {
    fontSize: 11,
    color: '#999',
  },
  unitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resourceCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFirstText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  yearInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f0ff',
    padding: 12,
    borderRadius: 8,
  },
  yearInfoText: {
    fontSize: 13,
    color: '#666',
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  aiButtonGradient: {
    padding: 14,
  },
});
