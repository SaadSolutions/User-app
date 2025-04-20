import { View, StyleSheet, Text, ScrollView, Alert } from "react-native";
import React, { useState, useCallback } from "react";
import { useTheme } from "@react-navigation/native";
import { windowHeight, windowWidth } from "@/themes/app.constant";
import { external } from "@/styles/external.style";
import styles from "@/screens/login/styles";
import color from "@/themes/app.colors";
import Button from "@/components/common/button";
import { router } from "expo-router";
import PhoneNumberInput from "@/components/login/phone-number.input";
import axios, { AxiosError } from "axios";

export default function LoginScreen() {
  const { colors } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("1");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasInputError, setHasInputError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>(
    "No button press detected"
  );

  // Handle input validation errors from child components
  const handleInputError = useCallback((hasError: boolean) => {
    setHasInputError(hasError);
    console.log("Phone validation status:", hasError ? "Invalid" : "Valid");
  }, []);

  const handleSubmit = async () => {
    // Debug info
    console.log("Continue button pressed!");
    console.log("Phone data:", { phoneNumber, countryCode, hasInputError });
    setDebugInfo(
      `Button pressed. Phone: +${countryCode}${phoneNumber}, Validation Error: ${hasInputError}`
    );
    Alert.alert(
      "Button Pressed",
      `Attempting to submit +${countryCode}${phoneNumber}`
    );

    // Reset error states
    setErrorMsg(null);

    // Validate phone input
    if (!phoneNumber || hasInputError) {
      const errorReason = !phoneNumber
        ? "Empty phone number"
        : "Validation error";
      console.log("Submission blocked:", errorReason);
      setErrorMsg("Please enter a valid phone number");
      Alert.alert("Validation Failed", errorReason);
      return;
    }

    setLoading(true);
    try {
      // Format phone number with country code
      const formattedPhoneNumber = `+${countryCode}${phoneNumber}`;

      console.log("Sending API request with:", formattedPhoneNumber);
      setDebugInfo(`Sending request with: ${formattedPhoneNumber}`);

      // Call authentication API with the correct path including /api/v1 prefix
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/v1/registration`,
        {
          phone_number: formattedPhoneNumber,
        }
      );

      console.log("API Response:", response.data);
      setDebugInfo(`Response received: ${JSON.stringify(response.data)}`);

      if (response.data && response.data.success) {
        Alert.alert("Success", "Verification code sent!");
        // Navigate to verification screen
        router.push({
          pathname: "/(routes)/otp-verification",
          params: {
            phoneNumber: formattedPhoneNumber,
          },
        });
      } else {
        // Handle unexpected success response format
        setErrorMsg("Unexpected response from server. Please try again.");
        console.log("Unexpected response format:", response.data);
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.log("Request failed:", error);
      setDebugInfo(`Request failed: ${error.message}`);

      if (axiosError.response) {
        // Server responded with error status
        const statusCode = axiosError.response.status;
        const responseData = axiosError.response.data as any;
        console.log(`HTTP Error ${statusCode}:`, responseData);

        if (statusCode === 400) {
          // Bad request - typically validation errors
          setErrorMsg(responseData.message || "Invalid phone number format");
        } else if (statusCode === 429) {
          // Rate limiting
          setErrorMsg("Too many attempts. Please try again later.");
        } else if (statusCode >= 500) {
          // Server error
          setErrorMsg("Server error. Please try again later.");
        } else {
          // Other HTTP errors
          setErrorMsg(
            responseData.message || "An error occurred during verification"
          );
        }

        console.error("Server Error:", axiosError.response.data);
      } else if (axiosError.request) {
        // Request made but no response received (network issue)
        setErrorMsg("Network error. Please check your internet connection.");
        console.error("Network Error:", axiosError.request);
      } else {
        // Error setting up the request
        setErrorMsg("An unexpected error occurred. Please try again later.");
        console.error("Error:", axiosError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: windowWidth(20) }}>
        {/* Logo */}
        <Text
          style={{
            fontFamily: "TT-Octosquares-Medium",
            fontSize: windowHeight(25),
            paddingTop: windowHeight(50),
            textAlign: "center",
          }}
        >
          Fast
        </Text>

        <View
          style={[
            localStyles.container,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={localStyles.contentWrapper}>
            <Text style={[localStyles.title, { color: colors.text }]}>
              Welcome to Fast
            </Text>
            <Text style={localStyles.subtitle}>
              Enter your phone number to continue
            </Text>

            <PhoneNumberInput
              phone_number={phoneNumber}
              setphone_number={setPhoneNumber}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              onError={handleInputError}
            />

            {/* Display error message if any */}
            {errorMsg && (
              <Text style={localStyles.errorText} testID="login-error-message">
                {errorMsg}
              </Text>
            )}

            {/* DEBUG SECTION */}
            <View style={localStyles.debugSection}>
              <Text style={localStyles.debugTitle}>Debug Info</Text>
              <Text>
                Phone: {phoneNumber ? `+${countryCode}${phoneNumber}` : "None"}
              </Text>
              <Text>Has validation error: {hasInputError ? "Yes" : "No"}</Text>
              <Text>
                Button state:{" "}
                {loading
                  ? "Loading"
                  : hasInputError || !phoneNumber
                  ? "Disabled"
                  : "Enabled"}
              </Text>
              <Text numberOfLines={3} style={localStyles.debugText}>
                {debugInfo}
              </Text>
            </View>

            <View style={localStyles.buttonContainer}>
              <Button
                onPress={handleSubmit}
                title="Continue"
                disabled={loading || hasInputError}
                backgroundColor={color.buttonBg}
                textColor={color.whiteColor}
                testID="login-submit-button"
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginTop: windowHeight(20),
  },
  contentWrapper: {
    padding: windowWidth(16),
  },
  title: {
    fontFamily: "TT-Octosquares-Medium",
    fontSize: windowHeight(20),
    marginBottom: windowHeight(8),
  },
  subtitle: {
    fontFamily: "TT-Octosquares-Regular",
    fontSize: windowHeight(14),
    color: color.subtitle,
    marginBottom: windowHeight(20),
  },
  errorText: {
    color: color.red,
    marginTop: windowHeight(10),
    marginBottom: windowHeight(5),
    fontFamily: "TT-Octosquares-Regular",
    fontSize: windowHeight(12),
  },
  buttonContainer: {
    marginTop: windowHeight(20),
  },
  debugSection: {
    marginTop: windowHeight(20),
    padding: windowWidth(10),
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  debugTitle: {
    fontFamily: "TT-Octosquares-Medium",
    fontSize: windowHeight(16),
    marginBottom: windowHeight(8),
    color: "#333",
  },
  debugText: {
    fontFamily: "TT-Octosquares-Regular",
    fontSize: windowHeight(12),
    color: "#666",
    marginTop: windowHeight(5),
  },
});
