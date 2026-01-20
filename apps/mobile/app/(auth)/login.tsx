import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0f172a]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          {/* Back Button */}
          <Animated.View 
            entering={FadeInDown.delay(100).springify()} 
            className="pt-4 items-start"
          >
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="p-3 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MaterialIcons 
                name="arrow-back" 
                size={28} 
                color={isDark ? '#ffffff' : '#0f172a'} 
              />
            </TouchableOpacity>
          </Animated.View>

          <View className="flex-1 justify-center pb-24">
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-14">
              <Text className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                Welcome back
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                Enter your details to access your personal workspace.
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <Input
                 label="EMAIL ADDRESS"
                 placeholder="name@university.edu"
                 value={email}
                 onChangeText={(t) => { setEmail(t); clearError(); }}
                 autoCapitalize="none"
                 keyboardType="email-address"
                 leftIcon="mail-outline"
                 className="bg-slate-50 dark:bg-slate-900/50 mb-8"
              />
              
              <View className="mb-2">
                <Input
                  label="PASSWORD"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-outline"
                  rightIcon={showPassword ? 'visibility-off' : 'visibility'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  className="bg-slate-50 dark:bg-slate-900/50"
                />
                <TouchableOpacity className="self-end mt-4">
                  <Text className="text-primary font-bold text-sm">Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {error && (
                <Animated.View 
                  entering={FadeInUp}
                  className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex-row items-center"
                >
                  <MaterialIcons name="error-outline" size={20} className="text-red-500 mr-2" />
                  <Text className="text-red-600 dark:text-red-400 text-sm font-medium flex-1">
                    {error}
                  </Text>
                </Animated.View>
              )}

              <Button
                title="Sign In"
                onPress={handleLogin}
                isLoading={isLoading}
                size="lg"
                className="mt-6 shadow-xl shadow-primary/20"
                rightIcon={<MaterialIcons name="arrow-forward" size={20} color="white" />}
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInUp.delay(500).springify()} className="mt-16 flex-row justify-center items-center space-x-1">
              <Text className="text-slate-500 dark:text-slate-400 font-medium">New to Kampus? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
                <Text className="text-primary font-bold text-base">Create account</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
