import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';

export type ReportType = 'MARKETPLACE' | 'SOCIAL' | 'LOST_FOUND';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  timeAgo: string;
  itemTitle?: string;
  reason: string;
  description: string;
  reporterNotes?: string;
  image?: string;
  priority?: boolean;
}

interface ReportCardProps {
  report: Report;
}

interface Config {
  color: string;
  label: string;
  badge?: string;
  text?: string;
  icon?: string;
}

const TYPE_CONFIG: Record<string, Config> = {
  'MARKETPLACE': { color: 'bg-black/60', label: 'MARKETPLACE', badge: 'bg-red-600' },
  'SOCIAL': { color: 'bg-[#3B82F6]/20', label: 'SOCIAL', text: 'text-[#3B82F6]', icon: 'gavel' },
  'LOST_FOUND': { color: 'bg-green-500/20', label: 'LOST & FOUND', text: 'text-green-500', icon: 'find-in-page' }
};

export function ReportCard({ report }: ReportCardProps) {
  const isMarketplace = report.type === 'MARKETPLACE';
  const config = TYPE_CONFIG[report.type];

  return (
    <View className="mb-4 rounded-2xl bg-[#1E1E1E] border border-white/10 overflow-hidden shadow-sm">
      {isMarketplace && report.image ? (
        <View className="relative w-full aspect-[21/9] bg-gray-800">
           <Image source={{ uri: report.image }} className="w-full h-full opacity-60" resizeMode="cover" />
           <View className="absolute top-3 left-3 flex-row gap-2">
              {report.priority && (
                <View className="px-2 py-1 bg-red-600 rounded-md">
                   <Text className="text-white text-[10px] font-bold uppercase">High Priority</Text>
                </View>
              )}
              <View className="px-2 py-1 bg-black/60 rounded-md backdrop-blur-md">
                 <Text className="text-white text-[10px] font-bold uppercase">{config.label}</Text>
              </View>
           </View>
        </View>
      ) : (
        <View className="px-4 pt-4">
           <View className="flex-row items-center gap-2">
              <View className={clsx("px-2 py-1 rounded-md", config.color)}>
                 <Text className={clsx("text-[10px] font-bold uppercase", config.text || "text-white")}>{config.label}</Text>
              </View>
              <Text className="text-base font-bold text-white">{report.title}</Text>
           </View>
        </View>
      )}

      <View className="p-4 flex-col gap-3">
         {!isMarketplace && (
            <View className="flex-row justify-between items-start">
                 {/* For non-marketplace, title is handled above with badge, but here we might need extra info */}
                 {!report.image && <View />} 
                 <Text className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{report.timeAgo}</Text>
            </View>
         )}
         
         {isMarketplace && (
            <View>
                <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-base font-bold text-white">{report.title}</Text>
                    <Text className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{report.timeAgo}</Text>
                </View>
                <Text className="text-xs text-gray-400 mb-3">Item: <Text className="text-gray-200">"{report.itemTitle}"</Text></Text>
            </View>
         )}

         <View className={clsx("flex-row items-center gap-2 mb-1 p-2 rounded-lg border", isMarketplace ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10")}>
            <MaterialIcons name="warning" size={16} color={isMarketplace ? "#EF4444" : "#94A3B8"} />
            <Text className={clsx("text-xs font-bold", isMarketplace ? "text-red-400" : "text-gray-300")}>Reason: {report.reason}</Text>
         </View>

         {report.description && (
             <View className="p-4 bg-white/5 rounded-xl border border-white/10">
                 <Text className="text-sm text-gray-200 leading-relaxed font-medium">"{report.description}"</Text>
             </View>
         )}

         {report.reporterNotes && (
            <View className="bg-black/20 p-3 rounded-xl border-l-2 border-[#3B82F6]">
                <Text className="text-[10px] font-bold text-[#3B82F6] uppercase mb-1">Reporter Notes</Text>
                <Text className="text-xs text-gray-400 italic">"{report.reporterNotes}"</Text>
            </View>
         )}

         {/* Actions */}
         <View className="grid grid-cols-4 gap-2 mt-2 flex-row justify-between">
            <TouchableOpacity className="flex-1 items-center justify-center h-10 rounded-xl border border-white/10 bg-white/5">
                <MaterialIcons name="visibility-off" size={16} color="#D1D5DB" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 items-center justify-center h-10 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <MaterialIcons name="volume-off" size={16} color="#FB923C" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 items-center justify-center h-10 rounded-xl bg-red-600">
                <MaterialIcons name="delete" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 items-center justify-center h-10 rounded-xl bg-purple-600">
                <MaterialIcons name="block" size={16} color="white" />
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
}
