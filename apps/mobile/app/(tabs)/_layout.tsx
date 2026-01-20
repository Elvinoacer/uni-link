import React from 'react';
import { Tabs } from 'expo-router';
import { TabBarProvider } from '../../context/TabBarContext';
import { CustomTabBar } from '../../components/navigation/TabBar';

export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs
        initialRouteName="home/index"
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="home/index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="marketplace/index"
          options={{
            title: 'Trade',
          }}
        />
        <Tabs.Screen
          name="communities/index"
          options={{
            title: 'Groups',
          }}
        />
        <Tabs.Screen
          name="post_fab"
          options={{
            title: '',
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
            },
          }}
        />
        <Tabs.Screen
          name="resources/index"
          options={{
            title: 'Study',
          }}
        />
        <Tabs.Screen
          name="events/index"
          options={{
            title: 'Events',
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
          }}
        />

      </Tabs>
    </TabBarProvider>
  );
}
