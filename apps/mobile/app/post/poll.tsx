import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import clsx from 'clsx';

export default function CreatePollScreen() {
  const router = useRouter();
  const [duration, setDuration] = useState(3);
  const [options, setOptions] = useState([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-light dark:bg-background-dark">
       <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#171f26]/80">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <MaterialIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-lg font-bold tracking-tight dark:text-white">Create Poll</Text>
          <TouchableOpacity 
            className="px-4 py-1.5"
            onPress={() => router.back()}
          >
             <Text className="text-[#1990e6] text-base font-bold">Post</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4 space-y-4">
          {/* Identity */}
          <View className="bg-white dark:bg-[#1e2124] rounded-xl border border-slate-200 dark:border-slate-800 p-1">
             <TouchableOpacity className="flex-row items-center gap-3 px-3 py-2 justify-between">
                <View className="flex-row items-center gap-3">
                   <Image source={{ uri: 'https://i.pravatar.cc/150?u=alex' }} className="size-10 rounded-full border border-primary/10" />
                   <View>
                      <Text className="text-xs text-slate-500 font-medium">Posting as</Text>
                      <Text className="text-sm font-semibold dark:text-white">Alex Rivera (Student Identity)</Text>
                   </View>
                </View>
                <MaterialIcons name="expand-more" size={24} color="#94A3B8" />
             </TouchableOpacity>
          </View>

          {/* Question */}
          <View className="bg-white dark:bg-[#1e2124] rounded-xl border border-slate-200 dark:border-slate-800 p-4">
             <Text className="text-sm font-bold pb-3 dark:text-white">Question</Text>
             <TextInput 
               multiline
               placeholder="What's happening on campus? e.g. Best late night study spot?"
               placeholderTextColor="#94A3B8"
               className="text-base text-slate-900 dark:text-white min-h-[120px] bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg"
               textAlignVertical="top"
             />
          </View>

          {/* Options */}
          <View className="bg-white dark:bg-[#1e2124] rounded-xl border border-slate-200 dark:border-slate-800 p-4">
             <View className="flex-row items-center justify-between pb-4">
                <Text className="text-sm font-bold uppercase tracking-wider dark:text-white">Poll Options</Text>
                <View className="bg-[#1990e6]/10 px-2 py-0.5 rounded-full">
                   <Text className="text-[10px] font-bold text-[#1990e6]">{options.length}/4</Text>
                </View>
             </View>
             
             <View className="space-y-3">
                {options.map((option, index) => (
                  <View key={option.id} className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                     <MaterialIcons name="drag-indicator" size={20} color="#94A3B8" style={{ marginLeft: 12 }} />
                     <TextInput
                       value={option.text}
                       onChangeText={(text) => updateOption(option.id, text)}
                       placeholder={`Option ${index + 1}`}
                       className="flex-1 h-12 px-3 text-sm font-medium dark:text-white"
                     />
                     {options.length > 2 && (
                        <TouchableOpacity onPress={() => removeOption(option.id)} className="px-3">
                           <MaterialIcons name="cancel" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                     )}
                  </View>
                ))}

                {options.length < 4 && (
                   <TouchableOpacity 
                     onPress={addOption}
                     className="flex-row items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg"
                   >
                      <MaterialIcons name="add-circle-outline" size={20} color="#1990e6" />
                      <Text className="text-sm font-bold text-[#1990e6]">Add another option</Text>
                   </TouchableOpacity>
                )}
             </View>
          </View>

          {/* Duration */}
          <View className="bg-white dark:bg-[#1e2124] rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-20">
             <View className="flex-row items-center justify-between pb-4">
                <Text className="text-sm font-bold uppercase tracking-wider dark:text-white">Poll Duration</Text>
             </View>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
                {[1, 3, 5, 7].map((d) => (
                   <TouchableOpacity 
                     key={d}
                     onPress={() => setDuration(d)}
                     className={clsx(
                       "w-16 h-16 rounded-xl items-center justify-center border mr-2",
                       duration === d 
                         ? "border-2 border-[#1990e6] bg-[#1990e6]/10" 
                         : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                     )}
                   >
                      <Text className={clsx("text-lg font-bold", duration === d ? "text-[#1990e6]" : "dark:text-white")}>{d}</Text>
                      <Text className={clsx("text-[10px] font-bold uppercase", duration === d ? "text-[#1990e6]" : "text-slate-500")}>
                         {d === 1 ? 'Day' : 'Days'}
                      </Text>
                   </TouchableOpacity>
                ))}
             </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
