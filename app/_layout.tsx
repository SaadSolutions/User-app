import "react-native-get-random-values";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { Stack } from "expo-router";
import { ToastProvider } from "react-native-toast-notifications";
import { LogBox, I18nManager } from "react-native";
import { useFonts } from "expo-font";
import i18n, { initLanguage } from "@/utils/i18n";

// Set RTL for Arabic
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "TT-Octosquares-Medium": require("../assets/fonts/TT-Octosquares-Medium.ttf"),
  });

  useEffect(() => {
    LogBox.ignoreAllLogs(true);
    // Initialize i18n
    initLanguage();

    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(routes)/onboarding/index" />
        <Stack.Screen name="(routes)/login/index" />
        <Stack.Screen name="(routes)/registration/index" />
        <Stack.Screen name="(routes)/otp-verification/index" />
        <Stack.Screen name="(routes)/email-verification/index" />
        <Stack.Screen name="(routes)/rideplan/index" />
        <Stack.Screen name="(routes)/ride-details/index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ToastProvider>
  );
}
