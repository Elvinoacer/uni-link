import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator, RefreshControl, Dimensions, Modal, StatusBar, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePublicProfile, useUserPosts, useFollowUser } from '../../hooks/useProfile';
import { useUserGallery } from '../../hooks/useGallery';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useAuthStore } from '../../store/authStore';
import { PostItem, Post } from '../../components/feed/PostItem';
import clsx from 'clsx';

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  
  const { data: profile, isLoading: profileLoading, refetch } = usePublicProfile(id);
  const { 
    data: postsData, 
    isLoading: postsLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch: refetchPosts 
  } = useUserPosts(id);
  const { data: galleryItems, isLoading: loadingGallery } = useUserGallery(id);
  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolio(id);
  const { mutate: toggleFollow, isPending: isFollowPending } = useFollowUser();

  const isOwnProfile = currentUser?.id === id;
  const posts = postsData?.pages.flatMap(page => page.posts) || [];
  
  const [activeTab, setActiveTab] = useState<'posts' | 'gallery' | 'portfolio'>('posts');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { width } = Dimensions.get('window');

  const handleFollow = () => {
    if (!id) return;
    toggleFollow({ userId: id, isFollowing: profile?.isFollowing || false });
  };

  const handleRefresh = () => {
    refetch();
    refetchPosts();
    // Invalidate gallery?
  };
  
  const renderImageModal = () => (
      <Modal
          visible={!!selectedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
      >
          <View className="flex-1 bg-black/95 justify-center items-center relative">
              <StatusBar hidden={true} />
              
              <TouchableOpacity 
                  onPress={() => setSelectedImage(null)}
                  className="absolute top-12 right-6 z-50 p-2 bg-black/40 rounded-full"
              >
                  <MaterialIcons name="close" size={30} color="white" />
              </TouchableOpacity>
              
              {selectedImage && (
                  <Image 
                      source={{ uri: selectedImage }} 
                      style={{ width: width, height: '100%' }}
                      contentFit="contain"
                  />
              )}
          </View>
      </Modal>
  );

  if (profileLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-[#121212] items-center justify-center">
        <ActivityIndicator size="large" color="#1990e6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-white dark:bg-[#121212] items-center justify-center">
        <MaterialIcons name="person-off" size={64} color="#ccc" />
        <Text className="text-gray-500 mt-4 text-lg">User not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-[#1990e6] px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#121212]">
      {renderImageModal()}
      <FlatList
        key={activeTab} // Force re-render when switching tabs (crucial for numColumns change)
        data={activeTab === 'posts' ? posts : galleryItems}
        numColumns={activeTab === 'gallery' ? 3 : 1}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={profileLoading} onRefresh={handleRefresh} tintColor="#1990e6" />
        }
        ListHeaderComponent={
          <>
            {/* Profile Header Background */}
            <View className="h-48 bg-[#1990e6] relative">
              <Image 
                source={{ uri: profile.bannerUrl || 'https://images.unsplash.com/photo-1541339907198-e08756ebafe1?w=800&fit=crop' }} 
                className="w-full h-full opacity-60"
                contentFit="cover"
              />
              <SafeAreaView className="absolute top-0 left-0 right-0 p-4">
                <View className="flex-row justify-between">
                  <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="size-10 rounded-full bg-black/20 items-center justify-center"
                  >
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="size-10 rounded-full bg-black/20 items-center justify-center"
                  >
                    <MaterialIcons name="more-vert" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>

            {/* Profile Info */}
            <View className="px-6 -mt-16">
              <View className="size-32 rounded-3xl border-4 border-white dark:border-[#121212] overflow-hidden bg-gray-200">
                <Image 
                  source={{ uri: profile.avatarUrl || `https://i.pravatar.cc/150?u=${profile.id}` }} 
                  className="w-full h-full"
                  contentFit="cover"
                />
              </View>
              
              <View className="mt-4 flex-row justify-between items-end">
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center">
                    <Text className="text-2xl font-black dark:text-white" numberOfLines={1}>
                      {profile.displayName || profile.username}
                    </Text>
                    {profile.isVerified && (
                      <MaterialIcons name="verified" size={20} color="#1990e6" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text className="text-[#1990e6] font-bold">@{profile.username}</Text>
                </View>
                
                {!isOwnProfile && (
                  <TouchableOpacity 
                    onPress={handleFollow}
                    disabled={isFollowPending}
                    className={clsx(
                      "px-6 py-2.5 rounded-full",
                      profile.isFollowing ? "bg-gray-100 dark:bg-gray-800" : "bg-[#1990e6]"
                    )}
                  >
                    {isFollowPending ? (
                      <ActivityIndicator size="small" color={profile.isFollowing ? "#1990e6" : "white"} />
                    ) : (
                      <Text className={clsx(
                        "font-bold",
                        profile.isFollowing ? "text-[#1990e6]" : "text-white"
                      )}>
                        {profile.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {profile.bio && (
                <Text className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                  {profile.bio}
                </Text>
              )}

              {/* Stats */}
              <View className="flex-row mt-6 py-4 border-y border-gray-100 dark:border-gray-800">
                <View className="flex-1 items-center">
                  <Text className="text-xl font-black dark:text-white">{profile.postsCount || 0}</Text>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">Posts</Text>
                </View>
                <View className="flex-1 items-center border-x border-gray-100 dark:border-gray-800">
                  <Text className="text-xl font-black dark:text-white">{profile.followingCount || 0}</Text>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">Following</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-xl font-black dark:text-white">{profile.followersCount || 0}</Text>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">Followers</Text>
                </View>
              </View>

              {/* Tabs */}
              <View className="flex-row mt-4 border-b border-gray-100 dark:border-gray-800">
                  <TouchableOpacity 
                    onPress={() => setActiveTab('posts')}
                    className={clsx(
                      "flex-1 items-center py-4 border-b-2",
                      activeTab === 'posts' ? "border-[#1990e6]" : "border-transparent"
                    )}
                  >
                     <Text className={clsx(
                       "text-sm font-bold uppercase tracking-wide",
                       activeTab === 'posts' ? "text-[#1990e6]" : "text-gray-400"
                     )}>
                        Posts
                     </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setActiveTab('portfolio')}
                    className={clsx(
                      "flex-1 items-center py-4 border-b-2",
                      activeTab === 'portfolio' ? "border-[#1990e6]" : "border-transparent"
                    )}
                  >
                     <Text className={clsx(
                       "text-sm font-bold uppercase tracking-wide",
                       activeTab === 'portfolio' ? "text-[#1990e6]" : "text-gray-400"
                     )}>
                        Portfolio
                     </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setActiveTab('gallery')}
                    className={clsx(
                      "flex-1 items-center py-4 border-b-2",
                      activeTab === 'gallery' ? "border-[#1990e6]" : "border-transparent"
                    )}
                  >
                     <Text className={clsx(
                       "text-sm font-bold uppercase tracking-wide",
                       activeTab === 'gallery' ? "text-[#1990e6]" : "text-gray-400"
                     )}>
                        Gallery
                     </Text>
                  </TouchableOpacity>
              </View>

              {/* Portfolio Content (rendered inline since it's not a list) */}
              {activeTab === 'portfolio' && (
                <View className="py-4">
                  {loadingPortfolio ? (
                    <View className="py-10 items-center">
                      <ActivityIndicator size="large" color="#1990e6" />
                    </View>
                  ) : !portfolio ? (
                    <View className="py-10 items-center">
                      <MaterialIcons name="work-outline" size={48} color="#ccc" />
                      <Text className="text-gray-400 mt-2">No portfolio yet</Text>
                    </View>
                  ) : (
                    <>
                      {/* Headline & Role */}
                      {(portfolio.headline || portfolio.roleTitle) && (
                        <View className="mb-4">
                          {portfolio.headline && (
                            <Text className="text-lg font-bold dark:text-white">{portfolio.headline}</Text>
                          )}
                          {portfolio.roleTitle && (
                            <Text className="text-[#1990e6] font-medium">{portfolio.roleTitle}</Text>
                          )}
                        </View>
                      )}

                      {/* Availability Badge */}
                      {portfolio.availabilityStatus && (
                        <View className={clsx(
                          "self-start px-3 py-1 rounded-full mb-4",
                          portfolio.availabilityStatus === 'open_to_work' && "bg-green-100",
                          portfolio.availabilityStatus === 'available' && "bg-yellow-100",
                          portfolio.availabilityStatus === 'busy' && "bg-red-100"
                        )}>
                          <Text className={clsx(
                            "text-xs font-bold",
                            portfolio.availabilityStatus === 'open_to_work' && "text-green-700",
                            portfolio.availabilityStatus === 'available' && "text-yellow-700",
                            portfolio.availabilityStatus === 'busy' && "text-red-700"
                          )}>
                            {portfolio.availabilityStatus === 'open_to_work' ? '🟢 Open to Work' 
                              : portfolio.availabilityStatus === 'available' ? '🟡 Available' 
                              : '🔴 Busy'}
                          </Text>
                        </View>
                      )}

                      {/* Bio */}
                      {portfolio.bio && (
                        <Text className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                          {portfolio.bio}
                        </Text>
                      )}

                      {/* Info Row */}
                      <View className="flex-row flex-wrap gap-4 mb-4">
                        {portfolio.location && (
                          <View className="flex-row items-center gap-1">
                            <MaterialIcons name="location-on" size={16} color="#9ca3af" />
                            <Text className="text-gray-500 text-sm">{portfolio.location}</Text>
                          </View>
                        )}
                        {portfolio.yearsOfExperience !== null && portfolio.yearsOfExperience !== undefined && (
                          <View className="flex-row items-center gap-1">
                            <MaterialIcons name="work" size={16} color="#9ca3af" />
                            <Text className="text-gray-500 text-sm">{portfolio.yearsOfExperience} yrs exp</Text>
                          </View>
                        )}
                        {portfolio.timezone && (
                          <View className="flex-row items-center gap-1">
                            <MaterialIcons name="schedule" size={16} color="#9ca3af" />
                            <Text className="text-gray-500 text-sm">{portfolio.timezone}</Text>
                          </View>
                        )}
                      </View>

                      {/* Links */}
                      {(portfolio.resumeUrl || portfolio.portfolioUrl) && (
                        <View className="flex-row gap-2 mb-4">
                          {portfolio.resumeUrl && (
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(portfolio.resumeUrl!)}
                              className="bg-[#1990e6]/10 px-4 py-2 rounded-full flex-row items-center gap-1"
                            >
                              <MaterialIcons name="description" size={16} color="#1990e6" />
                              <Text className="text-[#1990e6] font-bold text-sm">Resume</Text>
                            </TouchableOpacity>
                          )}
                          {portfolio.portfolioUrl && (
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(portfolio.portfolioUrl!)}
                              className="bg-[#1990e6]/10 px-4 py-2 rounded-full flex-row items-center gap-1"
                            >
                              <MaterialIcons name="link" size={16} color="#1990e6" />
                              <Text className="text-[#1990e6] font-bold text-sm">Portfolio</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Skills */}
                      {portfolio.skills?.length > 0 && (
                        <View className="mb-4">
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Skills</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {portfolio.skills.map((skill: string, idx: number) => (
                              <View key={idx} className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium">{skill}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Experience */}
                      {portfolio.experiences?.length > 0 && (
                        <View className="mb-4">
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Experience</Text>
                          {portfolio.experiences.map((exp: any) => (
                            <View key={exp.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-2">
                              <Text className="font-bold dark:text-white">{exp.title}</Text>
                              <Text className="text-[#1990e6] text-sm">{exp.company}</Text>
                              {exp.description && (
                                <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>{exp.description}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Education */}
                      {portfolio.education?.length > 0 && (
                        <View className="mb-4">
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Education</Text>
                          {portfolio.education.map((edu: any) => (
                            <View key={edu.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-2">
                              <Text className="font-bold dark:text-white">{edu.institution}</Text>
                              {edu.degree && (
                                <Text className="text-gray-500 text-sm">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Projects */}
                      {portfolio.projects?.length > 0 && (
                        <View className="mb-4">
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Projects</Text>
                          {portfolio.projects.map((project: any) => (
                            <TouchableOpacity 
                              key={project.id} 
                              className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-2"
                              onPress={() => project.url && Linking.openURL(project.url)}
                              disabled={!project.url}
                            >
                              <Text className="font-bold dark:text-white">{project.title}</Text>
                              {project.description && (
                                <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>{project.description}</Text>
                              )}
                              {project.url && (
                                <Text className="text-[#1990e6] text-xs mt-1">View Project →</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Certifications */}
                      {portfolio.certifications?.length > 0 && (
                        <View className="mb-4">
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Certifications</Text>
                          {portfolio.certifications.map((cert: any) => (
                            <View key={cert.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-2">
                              <Text className="font-bold dark:text-white">{cert.name}</Text>
                              {cert.issuer && <Text className="text-gray-500 text-sm">{cert.issuer}</Text>}
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => {
            if (activeTab === 'portfolio') return null; // Portfolio is rendered in header
            if (activeTab === 'gallery') {
                 return (
                    <TouchableOpacity 
                        onPress={() => setSelectedImage(item.imageUrl)}
                        style={{ width: (width) / 3, height: (width) / 3 }}
                        className="border border-white dark:border-[#121212]"
                    >
                        <Image 
                            source={{ uri: item.imageUrl }} 
                            className="w-full h-full" 
                            contentFit="cover" 
                        />
                    </TouchableOpacity>
                 );
            }
            return (
              <PostItem 
                post={item} 
                onPress={() => router.push(`/post/${item.id}` as any)} 
              />
            );
        }}
        ListEmptyComponent={
          (activeTab === 'posts' ? postsLoading : loadingGallery) ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#1990e6" />
            </View>
          ) : (
            <View className="py-20 items-center">
              <MaterialIcons name={activeTab === 'posts' ? "post-add" : "photo-library"} size={48} color="#ccc" />
              <Text className="text-gray-400 mt-2">
                  {activeTab === 'posts' ? "No posts yet" : "Gallery is empty"}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          (activeTab === 'posts' && isFetchingNextPage) ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#1990e6" />
            </View>
          ) : <View className="h-20" />
        }
        onEndReached={() => {
          if (activeTab === 'posts' && hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
