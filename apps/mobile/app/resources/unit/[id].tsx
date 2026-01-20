import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useStudyHierarchy, Unit } from '../../../hooks/useStudyHierarchy';
import { useApi } from '../../../hooks/useApi';

interface Resource {
  id: string;
  title: string;
  description?: string;
  fileType: string;
  resourceType: string;
  upvoteCount: number;
  downloadCount: number;
  createdAt: string;
  uploader: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

const resourceTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  lecture_notes: 'document-text',
  assignment: 'clipboard',
  exam: 'school',
  textbook: 'book',
  slide_deck: 'easel',
  lab_report: 'flask',
  project: 'construct',
  other: 'document',
};

const fileTypeColors: Record<string, string> = {
  pdf: '#E53935',
  docx: '#1976D2',
  pptx: '#FF9800',
  image: '#4CAF50',
  other: '#9E9E9E',
};

export default function UnitDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchUnit, selectedUnit } = useStudyHierarchy();
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadUnitData();
    }
  }, [id]);

  const loadUnitData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const unitData = await fetchUnit(id);
      if (unitData) {
        setResources(unitData.resources || []);
      }
    } catch (err) {
      console.error('Error loading unit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUnitData();
    setRefreshing(false);
  }, [id]);

  const handleResourcePress = (resource: Resource) => {
    router.push(`/resources/${resource.id}`);
  };

  const handleAIPress = () => {
    router.push({
      pathname: '/resources/ai-assistant',
      params: { 
        unitId: id, 
        unitName: selectedUnit?.name,
        unitCode: selectedUnit?.code 
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderResourceCard = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => handleResourcePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resourceHeader}>
        <View
          style={[
            styles.fileTypeBadge,
            { backgroundColor: fileTypeColors[item.fileType] || fileTypeColors.other },
          ]}
        >
          <Text style={styles.fileTypeText}>{item.fileType.toUpperCase()}</Text>
        </View>
        <View style={styles.resourceTypeBadge}>
          <Ionicons
            name={resourceTypeIcons[item.resourceType] || 'document'}
            size={14}
            color="#666"
          />
          <Text style={styles.resourceTypeText}>
            {item.resourceType.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.resourceTitle} numberOfLines={2}>
        {item.title}
      </Text>

      {item.description && (
        <Text style={styles.resourceDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.resourceFooter}>
        <View style={styles.uploaderInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.uploader.displayName?.[0] || item.uploader.username[0]}
            </Text>
          </View>
          <Text style={styles.uploaderName} numberOfLines={1}>
            {item.uploader.displayName || item.uploader.username}
          </Text>
        </View>
        <View style={styles.resourceStats}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-up" size={14} color="#666" />
            <Text style={styles.statText}>{item.upvoteCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="download-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.downloadCount}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="document-outline" size={48} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>No Resources Yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to upload resources for this unit
      </Text>
      <TouchableOpacity 
        style={styles.uploadFirstButton}
        onPress={() => router.push({
          pathname: '/resources/upload',
          params: { unitId: id }
        })}
      >
        <Ionicons name="cloud-upload" size={20} color="#fff" />
        <Text style={styles.uploadFirstText}>Upload Resource</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  const schoolColor = selectedUnit?.yearOfStudy?.course?.school?.color || '#6366F1';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f1419' : '#f5f5f5' }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: schoolColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.unitCode}>{selectedUnit?.code}</Text>
          <Text style={styles.unitName} numberOfLines={2}>{selectedUnit?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => {/* TODO: Search in unit */}}
        >
          <Ionicons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText} numberOfLines={1}>
          {selectedUnit?.yearOfStudy?.course?.school?.name} • {selectedUnit?.yearOfStudy?.course?.name} • {selectedUnit?.yearOfStudy?.name}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="document-text-outline" size={16} color="#666" />
          <Text style={styles.statChipText}>{resources.length} resources</Text>
        </View>
        {selectedUnit?.creditHours && (
          <View style={styles.statChip}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statChipText}>{selectedUnit.creditHours} credits</Text>
          </View>
        )}
      </View>

      {/* Resources List */}
      <FlatList
        data={resources}
        keyExtractor={(item) => item.id}
        renderItem={renderResourceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

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

      {/* Upload FAB */}
      <TouchableOpacity 
        style={[styles.uploadFab, { backgroundColor: schoolColor }]}
        onPress={() => router.push({
          pathname: '/resources/upload',
          params: { unitId: id }
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  unitCode: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  unitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumb: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statChipText: {
    fontSize: 13,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fileTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  fileTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  resourceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resourceTypeText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  uploaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  uploaderName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  resourceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
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
  uploadFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  uploadFirstText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  aiButton: {
    position: 'absolute',
    bottom: 100,
    right: 80,
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
  uploadFab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
