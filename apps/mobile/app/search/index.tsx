import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useSearch } from '../../hooks/useSearch';

const TRENDING = [
  { id: '1', tag: '#StanfordMidterms', posts: '1.2k' },
  { id: '2', tag: '#Hackathon2024', posts: '856' },
  { id: '3', tag: '#CampusCat', posts: '2.1k' },
  { id: '4', tag: '#FreeFood', posts: '3.4k' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useSearch(debouncedQuery);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#171f26]">
       {/* Search Header */}
       <View className="px-4 py-2 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
             <MaterialIcons name="arrow-back" size={24} color="#1782cf" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-slate-800 rounded-full px-4 h-10">
             <MaterialIcons name="search" size={20} color="#64748B" />
             <TextInput 
                placeholder="Search people, posts, events..."
                placeholderTextColor="#94A3B8"
                autoFocus
                className="flex-1 ml-2 text-sm dark:text-white"
                value={searchQuery}
                onChangeText={setSearchQuery}
             />
             {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                   <MaterialIcons name="cancel" size={20} color="#94A3B8" />
                </TouchableOpacity>
             )}
          </View>
       </View>

       <ScrollView className="flex-1">
        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#1782cf" />
            <Text className="text-gray-500 mt-4">Searching campus...</Text>
          </View>
        ) : debouncedQuery.length >= 2 ? (
          <View className="px-4 py-4">
             {/* People Section */}
             {data?.users?.length ? (
                <View className="mb-6">
                   <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">People</Text>
                   {data.users.map((user: any) => (
                      <TouchableOpacity 
                         key={user.id} 
                         onPress={() => router.push(`/profile?id=${user.id}` as any)}
                         className="flex-row items-center mb-4"
                      >
                         <Image source={{ uri: user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}` }} className="size-12 rounded-full bg-gray-200" />
                         <View className="ml-3">
                            <Text className="font-bold dark:text-white">{user.displayName || user.username}</Text>
                            <Text className="text-xs text-gray-500">@{user.username}</Text>
                         </View>
                      </TouchableOpacity>
                   ))}
                </View>
             ) : null}

             {/* Marketplace Section */}
             {data?.listings?.length ? (
                <View className="mb-6">
                   <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Marketplace</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {data.listings.map((item: any) => (
                         <TouchableOpacity 
                            key={item.id} 
                            onPress={() => router.push(`/marketplace/${item.id}`)}
                            className="mr-4 w-40"
                         >
                            <Image source={{ uri: item.image }} className="w-40 h-40 rounded-xl bg-gray-200" />
                            <Text className="font-bold mt-2 dark:text-white" numberOfLines={1}>{item.title}</Text>
                            <Text className="text-[#1990e6] font-bold">${item.price}</Text>
                         </TouchableOpacity>
                      ))}
                   </ScrollView>
                </View>
             ) : null}

             {/* Events Section */}
             {data?.events?.length ? (
                <View className="mb-6">
                   <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Events</Text>
                   {data.events.map((event: any) => (
                      <TouchableOpacity 
                         key={event.id} 
                         onPress={() => router.push(`/(tabs)/events`)}
                         className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl mb-3 flex-row items-center"
                      >
                         <MaterialIcons name="event" size={24} color="#1782cf" />
                         <View className="ml-3">
                            <Text className="font-bold dark:text-white">{event.title}</Text>
                            <Text className="text-xs text-gray-500">{event.location} • {new Date(event.startsAt).toLocaleDateString()}</Text>
                         </View>
                      </TouchableOpacity>
                   ))}
                </View>
             ) : null}

             {/* Posts Section */}
             {data?.posts?.length ? (
                <View className="mb-6">
                   <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Posts</Text>
                   {data.posts.map((post: any) => (
                      <TouchableOpacity 
                         key={post.id} 
                         onPress={() => router.push(`/(tabs)/home`)}
                         className="mb-4 pb-4 border-b border-gray-100 dark:border-slate-800"
                      >
                         <Text className="dark:text-white" numberOfLines={3}>{post.content}</Text>
                         <Text className="text-xs text-gray-500 mt-2">@{post.author?.username} • {new Date(post.createdAt).toLocaleDateString()}</Text>
                      </TouchableOpacity>
                   ))}
                </View>
             ) : null}

             {data && Object.values(data).every(arr => Array.isArray(arr) && arr.length === 0) && (
                <View className="items-center py-20">
                   <MaterialIcons name="search-off" size={64} color="#ccc" />
                   <Text className="text-gray-500 mt-4">No results found for "{debouncedQuery}"</Text>
                </View>
             )}
          </View>
        ) : (
          <View>
             <View className="px-4 py-6">
                <Text className="text-xl font-bold dark:text-white mb-4">Trending on Campus</Text>
                {TRENDING.map(trend => (
                   <TouchableOpacity key={trend.id} className="py-3 border-b border-gray-100 dark:border-slate-800">
                      <Text className="font-bold dark:text-white">{trend.tag}</Text>
                      <Text className="text-xs text-gray-500">{trend.posts} posts</Text>
                   </TouchableOpacity>
                ))}
             </View>

             <View className="px-4">
                <Text className="text-xl font-bold dark:text-white mb-4">Top Posts</Text>
                <View className="bg-gray-50 dark:bg-slate-800 p-6 rounded-3xl items-center">
                   <MaterialIcons name="star" size={48} color="#f59e0b" />
                   <Text className="text-center text-gray-500 mt-4 leading-relaxed">
                     Explore what's happening on campus by searching or following your classmates.
                   </Text>
                </View>
             </View>
          </View>
        )}
       </ScrollView>
    </SafeAreaView>
  );
}
