import React from 'react';
import { View, FlatList, RefreshControl, Text, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, withTiming, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedHeader } from '../../../components/feed/FeedHeader';
import { Composer } from '../../../components/feed/Composer';
import { PostItem, Post } from '../../../components/feed/PostItem';
import { MarketplaceCarousel } from '../../../components/feed/MarketplaceCarousel';
import { StoriesRow } from '../../../components/stories/StoriesRow';
import { useRouter } from 'expo-router';
import { usePosts } from '../../../hooks/usePosts';
import { useTabBarAnimation } from '../../../context/TabBarContext';
import { MaterialIcons } from '@expo/vector-icons';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function HomeScreen() {
  const router = useRouter();
  const [feedType, setFeedType] = React.useState<'global' | 'following'>('global');
  const { 
      data, 
      isLoading, 
      refetch, 
      isRefetching, 
      fetchNextPage, 
      hasNextPage, 
      isFetchingNextPage 
  } = usePosts(feedType);

  const { tabBarTranslateY } = useTabBarAnimation();
  const lastContentOffset = useSharedValue(0);

  // Scroll handler to hide/show tab bar
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentOffset = event.contentOffset.y;
      const diff = currentOffset - lastContentOffset.value;

      if (currentOffset <= 0 || currentOffset > event.contentSize.height - event.layoutMeasurement.height) {
        lastContentOffset.value = currentOffset;
        return;
      }

      if (Math.abs(diff) < 10) return;

      if (diff > 0) {
         if (tabBarTranslateY.value !== 100) {
            tabBarTranslateY.value = withTiming(100, { duration: 300 });
         }
      } else {
         if (tabBarTranslateY.value !== 0) {
            tabBarTranslateY.value = withTiming(0, { duration: 300 });
         }
      }

      lastContentOffset.value = currentOffset;
    },
  });

  // Map API data to UI Post format
  const feedData = React.useMemo(() => {
    const rawPosts = (data?.pages.flatMap(page => page.data) || []) as Post[];
    
    const formattedPosts = rawPosts
        .filter((p: Post) => (p.content && p.content.trim().length > 0) || p.image || p.poll);

    // Inject Marketplace Carousel
    if (formattedPosts.length > 0) {
        const injectionIndex = formattedPosts.length >= 2 ? 1 : 0;
        formattedPosts.splice(injectionIndex, 0, {
            id: 'bento_marketplace',
            author: { name: 'Marketplace', avatar: '', handle: 'marketplace' },
            content: '',
            createdAt: '',
            stats: { comments: 0, reposts: 0, likes: 0 },
            type: 'standard'
        } as Post);
    }
    return formattedPosts;
  }, [data]);

  const renderItem = ({ item, index }: { item: Post; index: number }) => {
    if (item.id === 'bento_marketplace') {
        return <MarketplaceCarousel />;
    }
    
    const handlePress = () => {
      if (item.postType === 'community' && item.originalId) {
        router.push(`/communities/posts/${item.originalId}` as any);
      } else {
        router.push(`/post/${item.id}` as any);
      }
    };
    
    return (
      <Animated.View entering={FadeIn.delay(index * 30).duration(400)}>
        <PostItem post={item} onPress={handlePress} />
      </Animated.View>
    );
  };

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View className="py-8 items-center gap-2">
          <ActivityIndicator size="small" color="#6366F1" />
          <Text className="text-xs text-gray-400 font-medium">Loading more posts...</Text>
        </View>
      );
    }
    return <View className="h-24" />;
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <View className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
          <Text className="text-gray-500 font-medium">Loading your feed...</Text>
        </View>
      );
    }
    
    return (
      <View className="flex-1 items-center justify-center py-20 px-8">
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
        >
          <MaterialIcons name="dynamic-feed" size={36} color="white" />
        </LinearGradient>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Your feed is empty
        </Text>
        <Text className="text-gray-500 text-center leading-6">
          {feedType === 'following' 
            ? "Follow some people to see their posts here!" 
            : "Be the first to share something with the campus!"}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#0f1419]" edges={['top']}>
       <FeedHeader activeTab={feedType} onTabChange={setFeedType} />
       <AnimatedFlatList
        data={feedData}
        renderItem={renderItem as any}
        keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
        ListHeaderComponent={
          <View className="bg-gray-50 dark:bg-[#0f1419]">
            <StoriesRow router={router} />
            <Composer />
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={refetch} 
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onEndReached={() => {
            if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
       />
    </SafeAreaView>
  );
}
