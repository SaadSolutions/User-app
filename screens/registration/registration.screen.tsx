import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import React, { useState, useCallback } from "react";
import { useTheme } from "@react-navigation/native";
import { windowHeight, windowWidth } from "@/themes/app.constant";
import TitleView from "@/components/signup/title.view";
import Input from "@/components/common/input";
import Button from "@/components/common/button";
import color from "@/themes/app.colors";
import { router, useLocalSearchParams } from "expo-router";
import axios, { AxiosError } from "axios";

export default function RegistrationScreen() {
  const { colors } = useTheme();
  const { user } = useLocalSearchParams() as any;
  const parsedUser = JSON.parse(user);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Email validation regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Name validation
  const validateName = (name: string) => {
    if (!name) {
      return { isValid: false, message: "Name is required" };
    }
    if (name.length < 2) {
      return { isValid: false, message: "Name must be at least 2 characters" };
    }
    return { isValid: true, message: "" };
  };

  // Email validation
  const validateEmail = (email: string) => {
    if (!email) {
      return { isValid: false, message: "Email is required" };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { isValid: false, message: "Please enter a valid email address" };
    }
    return { isValid: true, message: "" };
  };

  // Handle form field changes
  const handleChange = (key: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }));

    // Clear error when user starts typing
    setFormErrors((prev) => ({
      ...prev,
      [key]: "",
    }));
    setGeneralError("");
  };

  // Validate all form fields
  const validateForm = () => {
    const nameValidation = validateName(formData.name);
    const emailValidation = validateEmail(formData.email);

    setFormErrors({
      name: nameValidation.isValid ? "" : nameValidation.message,
      email: emailValidation.isValid ? "" : emailValidation.message,
    });

    return nameValidation.isValid && emailValidation.isValid;
  };

  const handleSubmit = async () => {
    // Reset general error
    setGeneralError("");

    // Validate all fields
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Send request to API
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/v1/email-otp-request`,
        {
          email: formData.email,
          name: formData.name,
          userId: parsedUser.id,
        }
      );

      // Prepare data for next screen
      const userData = {
        id: parsedUser.id,
        name: formData.name,
        email: formData.email,
        phone_number: parsedUser.phone_number,
        token: response.data.token,
      };

      // Navigate to email verification screen
      router.push({
        pathname: "/(routes)/email-verification",
        params: { user: JSON.stringify(userData) },
      });
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const statusCode = axiosError.response.status;
        const responseData = axiosError.response.data as any;

        if (statusCode === 400) {
          // Bad Request - typically validation errors
          if (responseData.message.includes("email")) {
            // Email-specific error
            setFormErrors((prev) => ({
              ...prev,
              email: responseData.message || "Invalid email format",
            }));
          } else {
            // General validation error
            setGeneralError(
              responseData.message || "Please check your input and try again"
            );
          }
        } else if (statusCode === 409) {
          // Conflict - e.g., email already in use
          setFormErrors((prev) => ({
            ...prev,
            email: "This email is already registered",
          }));
        } else if (statusCode >= 500) {
          // Server error
          setGeneralError("Server error. Please try again later.");
        } else {
          // Other HTTP errors
          setGeneralError(
            responseData.message || "An error occurred. Please try again."
          );
        }

        console.error("Server Error:", axiosError.response.data);
      } else if (axiosError.request) {
        // Network error
        setGeneralError(
          "Network error. Please check your internet connection."
        );
        console.error("Network Error:", axiosError.request);
      } else {
        // Setup error
        setGeneralError(
          "An unexpected error occurred. Please try again later."
        );
        console.error("Error:", axiosError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View>
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
        <View style={{ padding: windowWidth(20) }}>
          <View
            style={[styles.subView, { backgroundColor: colors.background }]}
          >
            <View style={styles.space}>
              <TitleView
                title={"Create your account"}
                subTitle="Explore your life by joining Ride Wave"
              />

              <Input
                title="Name"
                placeholder="Enter your name"
                value={formData.name}
                onChangeText={(text) => handleChange("name", text)}
                warning={formErrors.name}
                showWarning={!!formErrors.name}
                required={true}
                testID="name-input"
                validator={validateName}
              />

              <Input
                title="Phone Number"
                placeholder="Enter your phone number"
                value={parsedUser?.phone_number}
                disabled={true}
                testID="phone-input"
              />

              <Input
                title="Email Address"
                placeholder="Enter your email address"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => handleChange("email", text)}
                warning={formErrors.email}
                showWarning={!!formErrors.email}
                required={true}
                testID="email-input"
                validator={validateEmail}
                autoCapitalize="none"
              />

              {/* General error message */}
              {generalError !== "" && (
                <Text style={localStyles.errorText} testID="general-error">
                  {generalError}
                </Text>
              )}

              <View style={styles.margin}>
                <Button
                  onPress={() => handleSubmit()}
                  title="Next"
                  disabled={loading}
                  backgroundColor={color.buttonBg}
                  textColor={color.whiteColor}
                  testID="registration-submit-button"
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  subView: {
    height: "100%",
  },
  space: {
    marginHorizontal: windowWidth(4),
  },
  margin: {
    marginVertical: windowHeight(12),
  },
});

const localStyles = StyleSheet.create({
  errorText: {
    color: color.red,
    fontSize: windowHeight(14),
    marginTop: windowHeight(10),
    textAlign: "center",
  },
});
