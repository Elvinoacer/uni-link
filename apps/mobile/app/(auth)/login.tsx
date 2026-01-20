import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      if (!email || !password) return;
      await login(email, password);
      router.replace('/(tabs)/home');
    } catch (e) {
      // Error handled in store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 justify-center">
            
            {/* Header */}
            <View className="mb-10">
              <TouchableOpacity onPress={() => router.back()} className="mb-6">
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
                Welcome back!
              </Text>
              <Text className="text-gray-500 text-base">
                Sign in to continue your campus journey.
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4 gap-4">
              <Input
                 label="EMAIL"
                 placeholder="name@university.edu"
                 value={email}
                 onChangeText={(t) => { setEmail(t); clearError(); }}
                 autoCapitalize="none"
                 keyboardType="email-address"
              />
              
              <View>
                <Input
                  label="PASSWORD"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  secureTextEntry
                />
                <TouchableOpacity className="self-end mt-2">
                  <Text className="text-primary text-sm font-semibold">Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {error && (
                <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <Text className="text-red-600 dark:text-red-400 text-sm text-center font-medium">
                    {error}
                  </Text>
                </View>
              )}

              <Button
                title="Log In"
                onPress={handleLogin}
                isLoading={isLoading}
                size="lg"
                className="mt-4"
              />
            </View>

            {/* Footer */}
            <View className="mt-10 flex-row justify-center">
              <Text className="text-gray-500">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
                <Text className="text-primary font-bold">Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
