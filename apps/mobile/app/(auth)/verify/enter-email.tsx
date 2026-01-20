import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const BENEFITS = [
  {
    icon: 'verified-user',
    title: 'Build Trust',
    description: 'Show others you\'re a real student',
  },
  {
    icon: 'workspace-premium',
    title: 'Get a Badge',
    description: 'Receive a verified checkmark on your profile',
  },
  {
    icon: 'lock-open',
    title: 'Exclusive Access',
    description: 'Unlock campus-only events and marketplaces',
  },
];

export default function EnterEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email.includes('@') || !email.includes('.edu')) {
      setError('Please enter a valid institutional email (.edu)');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // TODO: Call API to send verification code
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push({
        pathname: '/(auth)/verify/confirm-code',
        params: { email }
      });
    } catch (e) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f5f7fa] dark:bg-[#121212]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="size-10 items-center justify-center"
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-base font-bold dark:text-white">Verification</Text>
          <View className="size-10" />
        </View>

        {/* Progress Bar */}
        <View className="flex-row justify-center gap-2 py-2">
          <View className="h-1 w-16 rounded-full bg-[#1990e6]" />
          <View className="h-1 w-16 rounded-full bg-gray-300 dark:bg-gray-700" />
          <View className="h-1 w-16 rounded-full bg-gray-300 dark:bg-gray-700" />
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Title */}
          <View className="mt-6 mb-8">
            <Text className="text-3xl font-black text-center text-[#1a3a52] dark:text-white mb-3">
              Verify Your Identity
            </Text>
            <Text className="text-center text-gray-500 leading-relaxed">
              Join your campus community to start trading and connecting with other students.
            </Text>
          </View>

          {/* Benefits */}
          <View className="bg-white dark:bg-gray-900 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-gray-800">
            {BENEFITS.map((benefit, index) => (
              <View 
                key={benefit.title}
                className={`flex-row items-start gap-4 ${index !== BENEFITS.length - 1 ? 'mb-5' : ''}`}
              >
                <View className="size-10 rounded-lg bg-[#1990e6]/10 items-center justify-center">
                  <MaterialIcons name={benefit.icon as any} size={20} color="#1990e6" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-[#1a3a52] dark:text-white">{benefit.title}</Text>
                  <Text className="text-sm text-gray-500">{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Institutional Email Address
            </Text>
            <Input
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              placeholder="student@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-white dark:bg-gray-900"
            />
            <Text className="text-xs text-gray-400 mt-2">
              We'll send a 6-digit code to your inbox
            </Text>
          </View>

          {error && (
            <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
              <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Support Link */}
          <TouchableOpacity className="mb-6">
            <Text className="text-center text-gray-500">
              Can't find your university?{' '}
              <Text className="text-[#1990e6] font-bold underline">Contact Support</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom CTA */}
        <View className="p-6 bg-[#f5f7fa] dark:bg-[#121212]">
          <Button
            title="Send Verification Code"
            rightIcon={<MaterialIcons name="arrow-forward" size={20} color="white" />}
            onPress={handleSendCode}
            isLoading={isLoading}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
