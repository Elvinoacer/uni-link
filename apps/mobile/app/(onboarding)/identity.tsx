import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';

export default function ChooseIdentityScreen() {
  const router = useRouter();
  const [selectedIdentity, setSelectedIdentity] = useState<'real' | 'pseudo'>('real');
  const [realName, setRealName] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0f172a]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          className="flex-row items-center justify-between px-6 pt-2 pb-6"
        >
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
          >
            <MaterialIcons name="chevron-left" size={24} color={isDark ? 'white' : 'black'} />
          </TouchableOpacity>
          
          <View className="flex-row gap-2">
            <View className="h-1.5 w-8 rounded-full bg-primary" />
            <View className="h-1.5 w-8 rounded-full bg-primary" />
            <View className="h-1.5 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          </View>

          <View className="w-10" />
        </Animated.View>

        <ScrollView className="flex-1 px-6">
          <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-2 mb-8">
            <Text className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              Choose Identity
            </Text>
            <Text className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              Switch between your professional self and a private alias anytime.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()} className="space-y-6">
            {/* Real Name Card */}
            <View 
              className={`rounded-3xl border-2 overflow-hidden ${
                selectedIdentity === 'real' 
                  ? 'bg-primary/5 border-primary shadow-xl shadow-primary/10' 
                  : 'bg-slate-50 dark:bg-slate-900/40 border-transparent'
              }`}
            >
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => setSelectedIdentity('real')}
                className="p-6 pb-2"
              >
                <View className="flex-row gap-5 items-start">
                  <View className={`w-14 h-14 items-center justify-center rounded-2xl ${selectedIdentity === 'real' ? 'bg-primary' : 'bg-white dark:bg-slate-800'}`}>
                    <MaterialIcons name="badge" size={28} color={selectedIdentity === 'real' ? 'white' : '#1990e6'} />
                  </View>
                  <View className="flex-1 pt-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-xs font-bold uppercase tracking-widest text-primary">
                        Professional
                      </Text>
                      {selectedIdentity === 'real' && (
                        <Animated.View entering={FadeInUp}>
                          <MaterialIcons name="check-circle" size={20} color="#1990e6" />
                        </Animated.View>
                      )}
                    </View>
                    <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      Real Name
                    </Text>
                    <Text className="text-sm text-slate-500 font-medium leading-relaxed">
                      Build your network. Best for marketplace, events, and study groups.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {selectedIdentity === 'real' && (
                <Animated.View entering={FadeInUp} className="px-6 pb-6 w-full">
                  <Input
                    label="FULL NAME"
                    value={realName}
                    onChangeText={setRealName}
                    placeholder="e.g., Alex Johnson"
                    className="bg-white dark:bg-slate-900 border border-primary/20"
                  />
                </Animated.View>
              )}
            </View>
          </Animated.View>

          <View className="h-32" /> 
        </ScrollView>

        <View className="p-6 bg-white/90 dark:bg-[#0f172a]/95 absolute bottom-0 left-0 right-0 border-t border-slate-100 dark:border-slate-800 backdrop-blur-md">
          <Button
            title="Continue"
            rightIcon={<MaterialIcons name="arrow-forward" size={20} color="white" />}
            onPress={() => router.push('/(onboarding)/interests')}
            size="lg"
            className="shadow-xl shadow-primary/25"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
