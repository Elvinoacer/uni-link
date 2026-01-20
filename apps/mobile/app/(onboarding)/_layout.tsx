import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="select-university" />
      <Stack.Screen name="identity" />
      <Stack.Screen name="interests" />
    </Stack>
  );
}
