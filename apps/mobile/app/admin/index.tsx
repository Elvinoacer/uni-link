import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ReportCard, Report } from '../../components/admin/ReportCard';

const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    type: 'MARKETPLACE',
    title: 'Restricted Item Listing',
    timeAgo: '2m ago',
    itemTitle: 'Study Aids - Fast Delivery',
    reason: 'Prohibited Items (Controlled Substances)',
    description: '',
    reporterNotes: 'This user has posted this multiple times today across different campus groups. Looks suspicious.',
    image: 'https://images.unsplash.com/photo-1585250003057-074f74d08018?w=800&fit=crop',
    priority: true
  },
  {
    id: '2',
    type: 'SOCIAL',
    title: 'Harassment Report',
    timeAgo: '15m ago',
    reason: 'Hate Speech / Bullying',
    description: 'Everyone in the Engineering building today is a total [Redacted]. You guys smell like failure.',
    reporterNotes: 'Targeting a specific group of students. Creates a hostile environment.'
  },
  {
    id: '3',
    type: 'LOST_FOUND',
    title: 'Content Spam',
    timeAgo: '1h ago',
    reason: 'Duplicate Content (4x)',
    description: 'Lost my keys near the Quad - multiple identical threads detected.',
  }
];

export default function AdminDashboardScreen() {
  return (
    <View className="flex-1 bg-[#121212]">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-[#121212]/90 sticky top-0 z-50 border-b border-white/5">
         <View className="px-4 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
               <View className="size-10 rounded-xl bg-[#3B82F6]/20 items-center justify-center">
                  <MaterialIcons name="security" size={24} color="#3B82F6" />
               </View>
               <View>
                  <Text className="text-lg font-bold leading-tight text-white">Moderation</Text>
                  <Text className="text-[10px] uppercase tracking-widest text-[#3B82F6] font-bold">Admin Console</Text>
               </View>
            </View>
            <View className="flex-row gap-2">
               <TouchableOpacity className="size-10 items-center justify-center rounded-full bg-white/5 border border-white/10">
                  <MaterialIcons name="search" size={20} color="white" />
               </TouchableOpacity>
               <TouchableOpacity className="size-10 items-center justify-center rounded-full bg-white/5 border border-white/10">
                  <MaterialIcons name="notifications" size={20} color="white" />
               </TouchableOpacity>
            </View>
         </View>

         {/* Stats */}
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 mb-2">
            <View className="w-40 p-4 rounded-2xl bg-[#1E1E1E] border border-[#3B82F6]/30 shadow-lg mr-3">
               <Text className="text-[11px] font-semibold text-[#3B82F6] uppercase tracking-wider">Pending Reports</Text>
               <View className="flex-row items-baseline gap-2 mt-1">
                  <Text className="text-3xl font-bold text-white">42</Text>
                  <View className="bg-[#3B82F6]/20 px-2 py-0.5 rounded-full">
                     <Text className="text-[10px] font-bold text-[#3B82F6]">+4 New</Text>
                  </View>
               </View>
            </View>
            <View className="w-40 p-4 rounded-2xl bg-[#1E1E1E] border border-white/5 mr-3">
               <Text className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Bans</Text>
               <View className="flex-row items-baseline gap-2 mt-1">
                  <Text className="text-3xl font-bold text-white">15</Text>
                  <Text className="text-[10px] font-medium text-gray-500">Global</Text>
               </View>
            </View>
         </ScrollView>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
         {/* Filter Bar */}
         <View className="py-3 px-4 border-b border-white/5 bg-[#121212]">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
               <TouchableOpacity className="h-9 px-5 rounded-full bg-[#3B82F6] items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">All Queue</Text>
               </TouchableOpacity>
               <TouchableOpacity className="h-9 px-4 rounded-full bg-[#1E1E1E] border border-white/10 items-center justify-center mr-2 flex-row gap-2">
                  <MaterialIcons name="people" size={14} color="#9CA3AF" />
                  <Text className="text-xs font-semibold text-gray-400">Social</Text>
               </TouchableOpacity>
               <TouchableOpacity className="h-9 px-4 rounded-full bg-[#1E1E1E] border border-white/10 items-center justify-center mr-2 flex-row gap-2">
                  <MaterialIcons name="store" size={14} color="#9CA3AF" />
                  <Text className="text-xs font-semibold text-gray-400">Marketplace</Text>
               </TouchableOpacity>
            </ScrollView>
         </View>

         {/* Queue */}
         <View className="p-4">
            <View className="flex-row items-center justify-between mb-4">
               <Text className="text-xs font-bold uppercase tracking-widest text-gray-500">Priority Queue</Text>
               <Text className="text-[10px] text-gray-600 font-medium">Showing 42 items</Text>
            </View>

            {MOCK_REPORTS.map(report => (
               <ReportCard key={report.id} report={report} />
            ))}
         </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#121212]/95 border-t border-white/5 px-6 pb-8 pt-3 flex-row justify-between">
         <View className="items-center gap-1">
            <MaterialIcons name="dashboard" size={24} color="#3B82F6" />
            <Text className="text-[10px] font-bold text-[#3B82F6]">Queue</Text>
         </View>
         <View className="items-center gap-1 opacity-40">
            <MaterialIcons name="history" size={24} color="#9CA3AF" />
            <Text className="text-[10px] font-bold text-gray-500">History</Text>
         </View>
         <View className="items-center gap-1 opacity-40">
            <MaterialIcons name="group" size={24} color="#9CA3AF" />
            <Text className="text-[10px] font-bold text-gray-500">Users</Text>
         </View>
         <View className="items-center gap-1 opacity-40">
            <MaterialIcons name="settings" size={24} color="#9CA3AF" />
            <Text className="text-[10px] font-bold text-gray-500">Settings</Text>
         </View>
      </View>
    </View>
  );
}
