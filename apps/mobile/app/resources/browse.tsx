import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useStudyHierarchy, School } from '../../hooks/useStudyHierarchy';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function BrowseSchoolsScreen() {
  const router = useRouter();
  const { 
    schools, 
    loading, 
    error, 
    fetchSchools, 
    seedData,
  } = useStudyHierarchy();

  const [refreshing, setRefreshing] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);

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
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setSeeding(false);
    }
  }, [seedData]);

  const handleSchoolPress = (school: School) => {
    router.push(`/resources/school/${school.id}`);
  };

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
      style={[styles.schoolCard, { marginLeft: index % 2 === 0 ? 0 : 8 }]}
      onPress={() => handleSchoolPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.bannerUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' }}
        style={styles.cardImage}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: item.color || '#6366F1' }]}>
          <Ionicons name={getIconName(item.iconName)} size={20} color="#fff" />
        </View>
        <Text style={styles.schoolName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.schoolMeta}>
          {item.yearCount || 0} year{item.yearCount !== 1 ? 's' : ''} of study
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="school-outline" size={64} color="#6366F1" />
      </View>
      <Text style={styles.emptyTitle}>No Schools Available</Text>
      <Text style={styles.emptySubtitle}>
        Schools will appear here once they're created by administrators.
      </Text>
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.seedButton}
          onPress={handleSeed}
          disabled={seeding}
        >
          {seeding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.seedButtonText}>Seed Sample Data</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Browse Schools</Text>
          <Text style={styles.headerSubtitle}>Select your faculty</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>
          Choose your school or faculty to browse study materials organized by year, course, and topic.
        </Text>
      </View>

      {loading && schools.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading schools...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(item) => item.id}
          renderItem={renderSchoolCard}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  schoolCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  schoolMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  seedButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  seedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
