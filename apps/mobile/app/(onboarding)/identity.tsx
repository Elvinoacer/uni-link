import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function ChooseIdentityScreen() {
  const router = useRouter();
  const [selectedIdentity, setSelectedIdentity] = useState<'real' | 'pseudo'>('real');
  const [realName, setRealName] = useState('');
  const [pseudonym, setPseudonym] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-card-light dark:bg-card-dark"
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#0e151b" />
          </TouchableOpacity>
          <Text className="text-xs font-bold uppercase tracking-widest opacity-60 text-text-light dark:text-text-dark">
            Step 2 of 3
          </Text>
          <View className="w-10" />
        </View>

        {/* Progress Bar */}
        <View className="flex-row justify-center gap-2 py-4">
          <View className="h-1 w-6 rounded-full bg-gray-300 dark:bg-gray-700" />
          <View className="h-1 w-12 rounded-full bg-primary" />
          <View className="h-1 w-6 rounded-full bg-gray-300 dark:bg-gray-700" />
        </View>

        <ScrollView className="flex-1 px-6">
          <View className="mt-4 mb-2">
            <Text className="text-3xl font-bold text-center text-text-light dark:text-text-dark">
              Your Campus Identity
            </Text>
            <Text className="text-center text-gray-500 mt-2 px-8 leading-relaxed">
              Switch between your professional self and a private alias anytime.
            </Text>
          </View>

          <View className="mt-8 space-y-6 gap-6">
            {/* Real Name Card */}
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setSelectedIdentity('real')}
              className={`p-5 rounded-xl border-2 transition-all ${
                selectedIdentity === 'real' 
                  ? 'bg-white dark:bg-card-dark border-primary shadow-lg shadow-primary/10' 
                  : 'bg-card-light dark:bg-card-dark border-transparent opacity-80'
              }`}
            >
              <View className="flex-row gap-4">
                <View className="w-12 h-12 items-center justify-center rounded-lg bg-primary/10">
                  <MaterialIcons name="badge" size={28} color="#1990e6" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Verified Identity
                    </Text>
                    {selectedIdentity === 'real' && (
                      <MaterialIcons name="check-circle" size={18} color="#1990e6" />
                    )}
                  </View>
                  <Text className="text-lg font-bold text-text-light dark:text-text-dark">
                    Real Name
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    Used for Marketplace, Study Groups, and Networking.
                  </Text>
                  
                  {selectedIdentity === 'real' && (
                    <View className="mt-4">
                      <Input
                        label="FULL NAME"
                        value={realName}
                        onChangeText={setRealName}
                        placeholder="e.g., Alex Johnson"
                        className="bg-gray-50 dark:bg-black/20"
                      />
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Pseudonym Card */}
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setSelectedIdentity('pseudo')}
              className={`p-5 rounded-xl border-2 transition-all ${
                selectedIdentity === 'pseudo' 
                  ? 'bg-white dark:bg-card-dark border-accent shadow-lg shadow-accent/10' 
                  : 'bg-card-light dark:bg-card-dark border-transparent opacity-80'
              }`}
            >
              <View className="flex-row gap-4">
                <View className="w-12 h-12 items-center justify-center rounded-lg bg-accent/10">
                  <MaterialIcons name="masks" size={28} color="#FFD700" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-accent">
                      Privacy Mode
                    </Text>
                    {selectedIdentity === 'pseudo' && (
                      <MaterialIcons name="check-circle" size={18} color="#FFD700" />
                    )}
                  </View>
                  <Text className="text-lg font-bold text-text-light dark:text-text-dark">
                    Pseudonym
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    Used for Confessions, Tips, and Anonymous Voting.
                  </Text>
                  
                  {selectedIdentity === 'pseudo' && (
                    <View className="mt-4">
                      <Input
                        label="ALIAS"
                        value={pseudonym}
                        onChangeText={setPseudonym}
                        placeholder="e.g., BlueCoyote_22"
                        className="bg-gray-50 dark:bg-black/20"
                      />
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center gap-2 mt-8 mb-4">
            <MaterialIcons name="security" size={16} color="#FFD700" />
            <Text className="text-xs text-center text-gray-500">
              You can toggle your active identity anytime.
            </Text>
          </View>
        </ScrollView>

        <View className="p-6 bg-background-light dark:bg-background-dark border-t border-gray-100 dark:border-gray-800">
          <Button
            title="Continue to Campus"
            onPress={() => router.push('/(onboarding)/interests')}
            size="lg"
          />
          <Text className="text-center mt-4 text-xs text-gray-400">
            By continuing, you agree to the Campus Trust & Safety Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
