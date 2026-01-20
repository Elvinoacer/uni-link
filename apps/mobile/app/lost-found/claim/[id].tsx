import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';


export default function ClaimVerificationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  return (
    <View className="flex-1 bg-slate-200 dark:bg-zinc-900 justify-center p-4">
      {/* Backdrop Simulation */}
      <View className="absolute inset-0 bg-black/60" />

      {/* Modal Container */}
      <View className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden flex-col self-center">
        {/* Handle */}
        <View className="items-center pt-2 pb-1">
           <View className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
           <TouchableOpacity onPress={() => router.back()} className="size-10 items-center justify-center">
              <MaterialIcons name="close" size={24} color="#1E293B" />
           </TouchableOpacity>
           <Text className="text-lg font-bold dark:text-white">Verify Your Claim</Text>
           <View className="size-10" />
        </View>

        {/* Content */}
        <View>
           {/* Image with Blur */}
           <View className="p-4">
              <ImageBackground 
                source={{ uri: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&fit=crop' }} 
                className="w-full aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-gray-100 relative"
              >
                 <View className="absolute inset-0 items-center justify-center bg-white/20 backdrop-blur-md">
                    <View className="bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full shadow-sm border border-white/20 flex-row items-center gap-2">
                       <MaterialIcons name="lock" size={14} color="#087d7d" />
                       <Text className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Visual Privacy Active</Text>
                    </View>
                 </View>
              </ImageBackground>
           </View>

           {/* Question */}
           <View className="px-4 pt-2">
              <Text className="text-[10px] font-extrabold text-[#087d7d] uppercase tracking-[0.2em]">Finder's Security Question</Text>
              <Text className="text-xl font-bold leading-tight pt-1 pb-2 dark:text-white">
                 What is the specific sticker on the back of this laptop?
              </Text>
              <Text className="text-slate-500 text-sm leading-relaxed mb-4">
                 The finder requested this information to ensure the item is returned to its rightful owner. Please be as descriptive as possible.
              </Text>
           </View>

           {/* Input */}
           <View className="p-4 gap-4">
              <View>
                 <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase px-1 mb-2">Your Answer</Text>
                 <TextInput 
                    multiline
                    numberOfLines={3}
                    placeholder="e.g. A small circular NASA sticker on the top left corner..."
                    textAlignVertical="top"
                    className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 p-3 text-sm dark:text-white h-24"
                 />
              </View>

              <View className="gap-3 pb-2">
                 <TouchableOpacity className="w-full bg-[#087d7d] py-4 rounded-xl items-center justify-center flex-row gap-2 active:opacity-90">
                    <Text className="text-white font-bold">Submit Claim</Text>
                    <MaterialIcons name="send" size={16} color="white" />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => router.back()} className="w-full py-3 items-center justify-center">
                    <Text className="text-slate-500 font-semibold">Cancel</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </View>
    </View>
  );
}
