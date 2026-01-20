import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useResources, ResourceType } from '../../hooks/useResources';
import { useStudyHierarchy, School, Course, YearOfStudy, Unit } from '../../hooks/useStudyHierarchy';

export default function UploadResourceScreen() {
  const router = useRouter();
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const { uploadResource, resourceTypes, fetchResourceTypes } = useResources();
  const { 
    fetchUnit, 
    selectedUnit, 
    fetchSchools, 
    schools, 
    fetchCourses, 
    courses,
    fetchYears,
    years,
    fetchUnits,
    units,
    loading: hierarchyLoading
  } = useStudyHierarchy();

  // Form state
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | null>(null);
  const [semester, setSemester] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Selection state (if unitId not provided)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(unitId || null);

  // Load initial data
  useEffect(() => {
    fetchResourceTypes();
    if (unitId) {
      fetchUnit(unitId);
      setSelectedUnitId(unitId);
    } else {
      fetchSchools();
    }
  }, [unitId]);

  // Handle manual hierarchy selection
  useEffect(() => {
    if (selectedSchoolId) {
      fetchCourses(selectedSchoolId);
      setSelectedCourseId(null);
      setSelectedYearId(null);
      setSelectedUnitId(null);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchYears(selectedCourseId);
      setSelectedYearId(null);
      setSelectedUnitId(null);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedYearId) {
      fetchUnits(selectedYearId);
      setSelectedUnitId(null);
    }
  }, [selectedYearId]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
        if (!title) {
          const name = result.assets[0].name;
          setTitle(name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!selectedResourceType) {
      Alert.alert('Error', 'Please select a resource type');
      return;
    }
    if (!selectedUnitId) {
      Alert.alert('Error', 'Please select a unit');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('unitId', selectedUnitId);
      formData.append('resourceType', selectedResourceType.value);
      if (semester.trim()) formData.append('semester', semester.trim());
      if (professorName.trim()) formData.append('professorName', professorName.trim());

      const response = await uploadResource(formData);

      if (response.success) {
        Alert.alert('Success', 'Resource uploaded successfully!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to upload resource');
      }
    } catch (error: any) {
      console.error('Error uploading:', error);
      Alert.alert('Error', error.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return 'document';
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('image')) return 'image';
    return 'document-text';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Resource</Text>
        <TouchableOpacity
          style={[styles.submitButton, (!file || !title || !selectedUnitId) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!file || !title || !selectedUnitId || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Upload</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Context: Unit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Unit *</Text>
          {unitId && selectedUnit ? (
            <View style={styles.contextBox}>
              <View style={styles.contextIcon}>
                <Ionicons name="school" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.contextCode}>{selectedUnit.code}</Text>
                <Text style={styles.contextName}>{selectedUnit.name}</Text>
              </View>
            </View>
          ) : (
            <View>
              {/* School Selector */}
              <Text style={styles.label}>School</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {schools.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, selectedSchoolId === s.id && styles.chipActive]}
                      onPress={() => setSelectedSchoolId(s.id)}
                    >
                      <Text style={[styles.chipText, selectedSchoolId === s.id && styles.chipTextActive]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Course Selector */}
              {selectedSchoolId && (
                <>
                  <Text style={styles.label}>Course</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipRow}>
                      {courses.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.chip, selectedCourseId === c.id && styles.chipActive]}
                          onPress={() => setSelectedCourseId(c.id)}
                        >
                          <Text style={[styles.chipText, selectedCourseId === c.id && styles.chipTextActive]}>
                            {c.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Year Selector */}
              {selectedCourseId && (
                <>
                  <Text style={styles.label}>Year</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipRow}>
                      {years.map(y => (
                        <TouchableOpacity
                          key={y.id}
                          style={[styles.chip, selectedYearId === y.id && styles.chipActive]}
                          onPress={() => setSelectedYearId(y.id)}
                        >
                          <Text style={[styles.chipText, selectedYearId === y.id && styles.chipTextActive]}>
                            Year {y.year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Unit Selector */}
              {selectedYearId && (
                <>
                  <Text style={styles.label}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipRow}>
                      {units.map(u => (
                        <TouchableOpacity
                          key={u.id}
                          style={[styles.chip, selectedUnitId === u.id && styles.chipActive]}
                          onPress={() => setSelectedUnitId(u.id)}
                        >
                          <Text style={[styles.chipText, selectedUnitId === u.id && styles.chipTextActive]}>
                            {u.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
            </View>
          )}
        </View>

        {/* File Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File *</Text>
          <TouchableOpacity style={styles.filePicker} onPress={pickDocument}>
            {file ? (
              <View style={styles.fileSelected}>
                <View style={styles.fileIconContainer}>
                   <Ionicons name={getFileIcon(file.mimeType) as any} size={32} color="#6366F1" />
                </View>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileMeta}>{formatFileSize(file.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => setFile(null)}>
                  <Ionicons name="close-circle" size={24} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.filePickerEmpty}>
                <Ionicons name="cloud-upload-outline" size={48} color="#ccc" />
                <Text style={styles.filePickerText}>Tap to select a file</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter resource title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        {/* Resource Type */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Resource Type *</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
             <View style={styles.chipRow}>
               {resourceTypes.map(t => (
                 <TouchableOpacity
                   key={t.value}
                   style={[styles.chip, selectedResourceType?.value === t.value && styles.chipActive]}
                   onPress={() => setSelectedResourceType(t)}
                 >
                   <Text style={[styles.chipText, selectedResourceType?.value === t.value && styles.chipTextActive]}>
                     {t.label}
                   </Text>
                 </TouchableOpacity>
               ))}
             </View>
           </ScrollView>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        {/* Extra Fields */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Additional Info</Text>
           <TextInput
             style={[styles.textInput, { marginBottom: 12 }]}
             placeholder="Professor Name"
             value={professorName}
             onChangeText={setProfessorName}
             placeholderTextColor="#999"
           />
           <TextInput
             style={styles.textInput}
             placeholder="Semester (e.g. Fall 2024)"
             value={semester}
             onChangeText={setSemester}
             placeholderTextColor="#999"
           />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  contextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  contextIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  contextName: {
    fontSize: 14,
    color: '#666',
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  chipScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#6366F1',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },
  filePicker: {
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  filePickerText: {
    marginTop: 8,
    color: '#999',
  },
  fileSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    width: '100%',
    gap: 12,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontWeight: '500',
    color: '#333',
  },
  fileMeta: {
    fontSize: 12,
    color: '#999',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
