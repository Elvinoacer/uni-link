import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';

export default function ConfirmCodeScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = async () => {
    // TODO: Resend verification code
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Verify code with API
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.replace('/(auth)/verify/account-linked');
    } catch (e) {
      setError('Invalid code. Please try again.');
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
          <View className="h-1 w-16 rounded-full bg-[#1990e6]" />
          <View className="h-1 w-16 rounded-full bg-gray-300 dark:bg-gray-700" />
        </View>

        <View className="flex-1 px-6 pt-8">
          {/* Step Indicator */}
          <Text className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Step 2 of 3
          </Text>

          {/* Title */}
          <Text className="text-3xl font-black text-center text-[#1a3a52] dark:text-white mb-3">
            Verify your Email
          </Text>
          <Text className="text-center text-gray-500 leading-relaxed mb-10">
            We've sent a 6-digit verification code to your university email address.
          </Text>

          {/* OTP Inputs */}
          <View className="flex-row justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                value={digit}
                onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                className="size-14 bg-white dark:bg-gray-900 rounded-xl text-center text-2xl font-bold text-[#1a3a52] dark:text-white border-2 border-gray-200 dark:border-gray-700 focus:border-[#1990e6]"
              />
            ))}
          </View>

          {/* Resend Link */}
          <TouchableOpacity onPress={handleResendCode} className="mb-8">
            <Text className="text-center text-gray-500">
              Didn't receive a code?{' '}
              <Text className="text-[#1990e6] font-bold">Resend Code</Text>
            </Text>
          </TouchableOpacity>

          {error && (
            <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
              <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Tip Box */}
          <View className="bg-[#22c55e]/10 rounded-xl p-4 flex-row items-start gap-3">
            <MaterialIcons name="info" size={20} color="#22c55e" />
            <Text className="flex-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <Text className="font-bold">Tip:</Text> Can't find the email? It might be hiding in your{' '}
              <Text className="text-[#1990e6] underline">Spam</Text> or{' '}
              <Text className="text-[#1990e6] underline">Promotions</Text> folder.
            </Text>
          </View>
        </View>

        {/* Bottom CTA */}
        <View className="p-6">
          <Button
            title="Verify & Link Account"
            rightIcon={<MaterialIcons name="verified" size={20} color="white" />}
            onPress={handleVerify}
            isLoading={isLoading}
            size="lg"
          />
          <Text className="text-center text-xs text-gray-400 mt-3 uppercase tracking-widest">
            Secure Campus Verification
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
