import { Stack } from 'expo-router';

export default function VerifyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="enter-email" />
      <Stack.Screen name="confirm-code" />
      <Stack.Screen name="account-linked" />
    </Stack>
  );
}
