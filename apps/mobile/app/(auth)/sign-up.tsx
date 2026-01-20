import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function SignUpScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError, setError } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    console.log('Register attempt:', { username, email });
    try {
      if (!username || !email || !password) {
        setError("All fields are required");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      
      await register({ username, email, password });
      // Go to verification flow next
      router.replace('/(onboarding)/select-university'); 
    } catch (e) {
      console.log('Register error caught in component:', e);
      // Error is already handled in store (set to state)
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} 
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 justify-center py-10">
            
            <View className="mb-8">
              <TouchableOpacity onPress={() => router.back()} className="mb-6">
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
                Create Account
              </Text>
              <Text className="text-gray-500 text-base">
                Join the exclusive community.
              </Text>
            </View>

            <View className="space-y-4 gap-4">
              <Input
                 label="USERNAME"
                 placeholder="choose_handle"
                 value={username}
                 onChangeText={(t) => { setUsername(t); clearError(); }}
                 autoCapitalize="none"
              />

              <Input
                 label="UNIVERSITY EMAIL"
                 placeholder="name@university.edu"
                 value={email}
                 onChangeText={(t) => { setEmail(t); clearError(); }}
                 autoCapitalize="none"
                 keyboardType="email-address"
              />
              
              <Input
                label="PASSWORD"
                placeholder="••••••••"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError(); }}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'visibility' : 'visibility-off'}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              <Input
                label="CONFIRM PASSWORD"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
                secureTextEntry={!showConfirmPassword}
                rightIcon={showConfirmPassword ? 'visibility' : 'visibility-off'}
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {error && (
                <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <Text className="text-red-600 dark:text-red-400 text-sm text-center font-medium">
                    {error}
                  </Text>
                </View>
              )}

              <Button
                title="Create Account"
                onPress={handleRegister}
                isLoading={isLoading}
                size="lg"
                className="mt-4"
              />
            </View>

            <View className="mt-10 flex-row justify-center">
              <Text className="text-gray-500">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="text-primary font-bold">Log in</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
