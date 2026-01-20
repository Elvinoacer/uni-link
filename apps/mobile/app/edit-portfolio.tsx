import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  useMyPortfolio, 
  useUpdatePortfolio, 
  useAddProject, 
  useDeleteProject,
  useAddExperience,
  useDeleteExperience,
  useAddEducation,
  useDeleteEducation,
  useAddCertification,
  useDeleteCertification,
} from '../hooks/usePortfolio';
import { Portfolio } from '../services/portfolio.service';

const AVAILABILITY_OPTIONS = [
  { value: 'open_to_work', label: '🟢 Open to Work', color: '#22c55e' },
  { value: 'available', label: '🟡 Available', color: '#eab308' },
  { value: 'busy', label: '🔴 Busy', color: '#ef4444' },
];

export default function EditPortfolioScreen() {
  const router = useRouter();
  const { data: portfolio, isLoading, refetch } = useMyPortfolio();
  const { mutate: updatePortfolio, isPending: isUpdating } = useUpdatePortfolio();
  const { mutate: addProject, isPending: isAddingProject } = useAddProject();
  const { mutate: deleteProject } = useDeleteProject();
  const { mutate: addExperience, isPending: isAddingExperience } = useAddExperience();
  const { mutate: deleteExperience } = useDeleteExperience();
  const { mutate: addEducation, isPending: isAddingEducation } = useAddEducation();
  const { mutate: deleteEducation } = useDeleteEducation();
  const { mutate: addCertification, isPending: isAddingCertification } = useAddCertification();
  const { mutate: deleteCertification } = useDeleteCertification();

  // Form State
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'open_to_work'>('open_to_work');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Load existing data
  useEffect(() => {
    if (portfolio) {
      setHeadline(portfolio.headline || '');
      setBio(portfolio.bio || '');
      setRoleTitle(portfolio.roleTitle || '');
      setLocation(portfolio.location || '');
      setTimezone(portfolio.timezone || '');
      setYearsOfExperience(portfolio.yearsOfExperience?.toString() || '');
      setResumeUrl(portfolio.resumeUrl || '');
      setPortfolioUrl(portfolio.portfolioUrl || '');
      setAvailabilityStatus(portfolio.availabilityStatus || 'open_to_work');
      setSkills(portfolio.skills || []);
    }
  }, [portfolio]);

  const handleSave = () => {
    // Validate required fields
    if (!headline.trim()) {
      Alert.alert('Required Field', 'Please enter a headline');
      return;
    }
    if (!roleTitle.trim()) {
      Alert.alert('Required Field', 'Please enter your role/title');
      return;
    }

    updatePortfolio({
      headline: headline.trim(),
      bio: bio.trim() || undefined,
      roleTitle: roleTitle.trim(),
      location: location.trim() || undefined,
      timezone: timezone.trim() || undefined,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
      resumeUrl: resumeUrl.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      availabilityStatus,
      skills,
    }, {
      onSuccess: () => {
        Alert.alert('Success', 'Portfolio updated!');
        refetch();
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to update portfolio');
      },
    });
  };

  const handleAddSkill = () => {
    const skill = newSkill.trim();
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  // Project handlers
  const handleAddProject = () => {
    Alert.prompt('Add Project', 'Enter project title', (title: string) => {
      if (title?.trim()) {
        addProject({ title: title.trim() }, {
          onSuccess: () => refetch(),
          onError: () => Alert.alert('Error', 'Failed to add project'),
        });
      }
    });
  };

  const handleDeleteProject = (id: string) => {
    Alert.alert('Delete Project', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProject(id, { onSuccess: () => refetch() }) },
    ]);
  };

  // Experience handlers
  const handleAddExperience = () => {
    Alert.alert('Add Experience', 'Enter company and title', [
      {
        text: 'Continue',
        onPress: () => {
          addExperience({ 
            company: 'Company Name', 
            title: 'Job Title', 
            startDate: new Date().toISOString() 
          }, {
            onSuccess: () => {
              refetch();
              Alert.alert('Success', 'Experience added. Edit details by tapping on it.');
            },
            onError: () => Alert.alert('Error', 'Failed to add experience'),
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteExperience = (id: string) => {
    Alert.alert('Delete Experience', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExperience(id, { onSuccess: () => refetch() }) },
    ]);
  };

  // Education handlers
  const handleAddEducation = () => {
    Alert.prompt('Add Education', 'Enter institution name', (institution: string) => {
      if (institution?.trim()) {
        addEducation({ institution: institution.trim() }, {
          onSuccess: () => refetch(),
          onError: () => Alert.alert('Error', 'Failed to add education'),
        });
      }
    });
  };

  const handleDeleteEducation = (id: string) => {
    Alert.alert('Delete Education', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEducation(id, { onSuccess: () => refetch() }) },
    ]);
  };

  // Certification handlers
  const handleAddCertification = () => {
    Alert.prompt('Add Certification', 'Enter certification name', (name: string) => {
      if (name?.trim()) {
        addCertification({ name: name.trim() }, {
          onSuccess: () => refetch(),
          onError: () => Alert.alert('Error', 'Failed to add certification'),
        });
      }
    });
  };

  const handleDeleteCertification = (id: string) => {
    Alert.alert('Delete Certification', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCertification(id, { onSuccess: () => refetch() }) },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#121212] items-center justify-center">
        <ActivityIndicator size="large" color="#1990e6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#121212]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <MaterialIcons name="arrow-back" size={24} color="#1990e6" />
          </TouchableOpacity>
          <Text className="text-lg font-bold dark:text-white">Edit Portfolio</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isUpdating}
            className="bg-[#1990e6] px-4 py-2 rounded-full"
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Basic Info Section */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-6 mb-3">Basic Info (Required)</Text>
          
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-xs font-bold text-gray-500">Headline</Text>
              <Text className="text-red-500 ml-1">*</Text>
            </View>
            <TextInput
              value={headline}
              onChangeText={setHeadline}
              placeholder="e.g. Full Stack Developer | Open Source Enthusiast"
              placeholderTextColor="#9ca3af"
              className={`bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border ${!headline.trim() ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              maxLength={200}
            />

            <View className="flex-row items-center mb-1 mt-4">
              <Text className="text-xs font-bold text-gray-500">Role/Title</Text>
              <Text className="text-red-500 ml-1">*</Text>
            </View>
            <TextInput
              value={roleTitle}
              onChangeText={setRoleTitle}
              placeholder="e.g. Full Stack Developer"
              placeholderTextColor="#9ca3af"
              className={`bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border ${!roleTitle.trim() ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />

            <Text className="text-xs font-bold text-gray-500 mb-1 mt-4">Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700 min-h-[100px]"
              textAlignVertical="top"
            />

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1">Location</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City, Country"
                  placeholderTextColor="#9ca3af"
                  className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-500 mb-1">Timezone</Text>
                <TextInput
                  value={timezone}
                  onChangeText={setTimezone}
                  placeholder="e.g. GMT+3"
                  placeholderTextColor="#9ca3af"
                  className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700"
                />
              </View>
            </View>

            <Text className="text-xs font-bold text-gray-500 mb-1 mt-4">Years of Experience</Text>
            <TextInput
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              placeholder="e.g. 3"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700"
            />
          </View>

          {/* Links Section */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-3">Links</Text>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-bold text-gray-500 mb-1">Resume URL</Text>
            <TextInput
              value={resumeUrl}
              onChangeText={setResumeUrl}
              placeholder="https://drive.google.com/..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700"
            />

            <Text className="text-xs font-bold text-gray-500 mb-1 mt-4">Portfolio URL</Text>
            <TextInput
              value={portfolioUrl}
              onChangeText={setPortfolioUrl}
              placeholder="https://yourportfolio.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700"
            />
          </View>

          {/* Availability Status */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-3">Availability</Text>
          <View className="flex-row gap-2 mb-4">
            {AVAILABILITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setAvailabilityStatus(opt.value as any)}
                className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                  availabilityStatus === opt.value 
                    ? 'border-[#1990e6] bg-[#1990e6]/10' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <Text className={`text-sm font-bold ${availabilityStatus === opt.value ? 'text-[#1990e6]' : 'text-gray-600 dark:text-gray-400'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skills Section */}
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-3">Skills</Text>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            <View className="flex-row gap-2 mb-3">
              <TextInput
                value={newSkill}
                onChangeText={setNewSkill}
                placeholder="Add a skill..."
                placeholderTextColor="#9ca3af"
                className="flex-1 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-base dark:text-white border border-gray-200 dark:border-gray-700"
                onSubmitEditing={handleAddSkill}
              />
              <TouchableOpacity 
                onPress={handleAddSkill}
                className="bg-[#1990e6] px-4 rounded-xl items-center justify-center"
              >
                <MaterialIcons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <View key={idx} className="bg-[#1990e6]/10 px-3 py-1.5 rounded-full flex-row items-center">
                  <Text className="text-[#1990e6] font-medium text-sm">{skill}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSkill(skill)} className="ml-1">
                    <MaterialIcons name="close" size={16} color="#1990e6" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Projects Section */}
          <View className="flex-row items-center justify-between mt-4 mb-3">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">Projects</Text>
            <TouchableOpacity onPress={handleAddProject} disabled={isAddingProject}>
              {isAddingProject ? (
                <ActivityIndicator size="small" color="#1990e6" />
              ) : (
                <MaterialIcons name="add-circle" size={24} color="#1990e6" />
              )}
            </TouchableOpacity>
          </View>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            {portfolio?.projects?.length ? (
              portfolio.projects.map((project: any) => (
                <View key={project.id} className="flex-row items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <View className="flex-1">
                    <Text className="font-bold dark:text-white">{project.title}</Text>
                    {project.description && <Text className="text-xs text-gray-500" numberOfLines={1}>{project.description}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteProject(project.id)}>
                    <MaterialIcons name="delete" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className="text-gray-400 text-center py-4">No projects yet. Tap + to add.</Text>
            )}
          </View>

          {/* Experience Section */}
          <View className="flex-row items-center justify-between mt-4 mb-3">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">Work Experience</Text>
            <TouchableOpacity onPress={handleAddExperience} disabled={isAddingExperience}>
              {isAddingExperience ? (
                <ActivityIndicator size="small" color="#1990e6" />
              ) : (
                <MaterialIcons name="add-circle" size={24} color="#1990e6" />
              )}
            </TouchableOpacity>
          </View>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            {portfolio?.experiences?.length ? (
              portfolio.experiences.map((exp: any) => (
                <View key={exp.id} className="flex-row items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <View className="flex-1">
                    <Text className="font-bold dark:text-white">{exp.title}</Text>
                    <Text className="text-xs text-gray-500">{exp.company}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteExperience(exp.id)}>
                    <MaterialIcons name="delete" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className="text-gray-400 text-center py-4">No experience yet. Tap + to add.</Text>
            )}
          </View>

          {/* Education Section */}
          <View className="flex-row items-center justify-between mt-4 mb-3">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">Education</Text>
            <TouchableOpacity onPress={handleAddEducation} disabled={isAddingEducation}>
              {isAddingEducation ? (
                <ActivityIndicator size="small" color="#1990e6" />
              ) : (
                <MaterialIcons name="add-circle" size={24} color="#1990e6" />
              )}
            </TouchableOpacity>
          </View>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            {portfolio?.education?.length ? (
              portfolio.education.map((edu: any) => (
                <View key={edu.id} className="flex-row items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <View className="flex-1">
                    <Text className="font-bold dark:text-white">{edu.institution}</Text>
                    {edu.degree && <Text className="text-xs text-gray-500">{edu.degree} {edu.field ? `in ${edu.field}` : ''}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteEducation(edu.id)}>
                    <MaterialIcons name="delete" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className="text-gray-400 text-center py-4">No education yet. Tap + to add.</Text>
            )}
          </View>

          {/* Certifications Section */}
          <View className="flex-row items-center justify-between mt-4 mb-3">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">Certifications</Text>
            <TouchableOpacity onPress={handleAddCertification} disabled={isAddingCertification}>
              {isAddingCertification ? (
                <ActivityIndicator size="small" color="#1990e6" />
              ) : (
                <MaterialIcons name="add-circle" size={24} color="#1990e6" />
              )}
            </TouchableOpacity>
          </View>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-4">
            {portfolio?.certifications?.length ? (
              portfolio.certifications.map((cert: any) => (
                <View key={cert.id} className="flex-row items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <View className="flex-1">
                    <Text className="font-bold dark:text-white">{cert.name}</Text>
                    {cert.issuer && <Text className="text-xs text-gray-500">{cert.issuer}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCertification(cert.id)}>
                    <MaterialIcons name="delete" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className="text-gray-400 text-center py-4">No certifications yet. Tap + to add.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
