import { I18n } from "i18n-js";
import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ar from "./ar";
import en from "./en";

// Create i18n instance
const i18n = new I18n({
  en,
  ar,
});

// Set default locale to Arabic as requested
i18n.defaultLocale = "ar";
i18n.locale = "ar";
i18n.enableFallback = true;

// Get device language
const getDeviceLanguage = () => {
  const locale =
    Platform.OS === "ios"
      ? NativeModules.SettingsManager.settings.AppleLocale ||
        NativeModules.SettingsManager.settings.AppleLanguages[0]
      : NativeModules.I18nManager.localeIdentifier;

  return locale.substring(0, 2);
};

// Initialize language from device or storage
export const initLanguage = async () => {
  try {
    // Always set to Arabic as requested
    await AsyncStorage.setItem("language", "ar");
    i18n.locale = "ar";
  } catch (error) {
    console.error("Error setting language:", error);
  }
};

export default i18n;
