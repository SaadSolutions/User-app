import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { commonStyles } from "@/styles/common.style";
import { windowHeight, windowWidth } from "@/themes/app.constant";
import { external } from "@/styles/external.style";
import styles from "@/screens/login/styles";
import color from "@/themes/app.colors";
import SelectInput from "../common/select-input";
import { countryItems } from "@/configs/country-list";
import { useState, useEffect, useMemo } from "react";

interface Props {
  width?: number;
  phone_number: string;
  setphone_number: (phone_number: string) => void;
  countryCode: string;
  setCountryCode: (countryCode: string) => void;
  onError?: (isError: boolean) => void;
}

export default function PhoneNumberInput({
  width,
  phone_number,
  setphone_number,
  countryCode,
  setCountryCode,
  onError,
}: Props) {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [validationDetails, setValidationDetails] =
    useState<string>("No validation yet");

  // Phone number validation per country
  const phoneValidations: Record<string, { regex: RegExp; length: number }> = {
    "1": { regex: /^[2-9]\d{9}$/, length: 10 }, // US/Canada: 10 digits, no leading 1
    "44": { regex: /^[1-9]\d{9}$/, length: 10 }, // UK: 10 digits
    "91": { regex: /^[6-9]\d{9}$/, length: 10 }, // India: 10 digits, starts with 6-9
    "880": { regex: /^[1-9]\d{9}$/, length: 10 }, // Bangladesh: 10 digits
    // Add more countries as needed
  };

  // Get the current country's validation rules or use default
  const currentValidation = useMemo(() => {
    console.log(`Selected country code: ${countryCode}`);
    const validation = phoneValidations[countryCode] || {
      regex: /^\d+$/,
      length: 10,
    };
    console.log(
      `Using validation pattern: ${validation.regex}, length: ${validation.length}`
    );
    return validation;
  }, [countryCode]);

  // Validate phone number on change or submission
  const validatePhoneNumber = (phoneNumber: string, isSubmitting = false) => {
    console.log(
      `Validating: "${phoneNumber}", Length: ${phoneNumber.length}, Required: ${currentValidation.length}`
    );

    // Empty check only on submission or after touch
    if ((isSubmitting || isTouched) && !phoneNumber) {
      console.log("Validation failed: Empty phone number");
      setValidationDetails("Empty phone number");
      setIsValid(false);
      setErrorMessage("Phone number is required");
      return false;
    }

    // Format validation only if there's input
    if (phoneNumber) {
      // Check if phone number matches the pattern for the selected country
      const regexTest = currentValidation.regex.test(phoneNumber);
      console.log(
        `Regex test (${currentValidation.regex}): ${
          regexTest ? "PASSED" : "FAILED"
        }`
      );

      if (!regexTest) {
        setValidationDetails(
          `Failed regex test: ${phoneNumber} doesn't match ${currentValidation.regex}`
        );
        setIsValid(false);
        setErrorMessage(`Please enter a valid phone number`);
        return false;
      }

      // Check length requirements
      const lengthCheck = phoneNumber.length === currentValidation.length;
      console.log(
        `Length check (${phoneNumber.length}/${currentValidation.length}): ${
          lengthCheck ? "PASSED" : "FAILED"
        }`
      );

      if (!lengthCheck) {
        setValidationDetails(
          `Failed length test: ${phoneNumber.length}/${currentValidation.length}`
        );
        setIsValid(false);
        setErrorMessage(
          `Phone number must be ${currentValidation.length} digits`
        );
        return false;
      }
    }

    // All checks passed
    console.log("Validation PASSED ✓");
    setValidationDetails("All validation tests passed");
    setIsValid(true);
    setErrorMessage("");
    return true;
  };

  // Validate on phone number change
  useEffect(() => {
    if (isTouched) {
      validatePhoneNumber(phone_number);
    }

    // Notify parent component about validation state
    if (onError) {
      console.log(`Sending validation status to parent: ${!isValid}`);
      onError(!isValid);
    }
  }, [phone_number, isTouched, countryCode, isValid]);

  // Handle phone number input changes
  const handlePhoneChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, "");
    console.log(`Input changed: "${text}" -> "${digitsOnly}"`);
    setphone_number(digitsOnly);
    if (!isTouched) {
      console.log("Setting touched state to true");
      setIsTouched(true);
    }
  };

  return (
    <View>
      <Text
        style={[commonStyles.mediumTextBlack, { marginTop: windowHeight(8) }]}
      >
        Phone Number
      </Text>
      <View style={[external.fd_row, external.ai_center, external.mt_5]}>
        <View
          style={[styles.countryCodeContainer, { borderColor: color.border }]}
        >
          <SelectInput
            title={`+${countryCode}`}
            placeholder="Select country"
            value={countryCode}
            onValueChange={(value) => {
              setCountryCode(value);
              // Re-validate with new country code
              if (isTouched) {
                validatePhoneNumber(phone_number);
              }
            }}
            showWarning={false}
            warning={"Please choose your country code!"}
            items={countryItems}
            testID="country-code-selector"
          />
        </View>
        <View
          style={[
            styles.phoneNumberInput,
            {
              width: width || windowWidth(260),
              borderColor: isValid ? color.border : color.red,
            },
          ]}
        >
          <TextInput
            style={[commonStyles.regularText]}
            placeholderTextColor={color.subtitle}
            placeholder={"Enter your number"}
            keyboardType="numeric"
            value={phone_number}
            onChangeText={handlePhoneChange}
            maxLength={currentValidation.length}
            testID="phone-number-input"
            onBlur={() => setIsTouched(true)}
          />
          {isSubmitting && (
            <ActivityIndicator size="small" color={color.buttonBg} />
          )}
        </View>
      </View>

      {/* Error message */}
      {!isValid && isTouched && (
        <Text style={localStyles.errorText} testID="phone-error-message">
          {errorMessage}
        </Text>
      )}

      {/* Helper text */}
      <Text style={localStyles.helperText}>
        We'll send a verification code to this number
      </Text>

      {/* Debug validation details */}
      <View style={localStyles.debugBox}>
        <Text style={localStyles.debugTitle}>Validation Status:</Text>
        <Text
          style={[
            localStyles.validationDetailsText,
            { color: isValid ? "green" : "red" },
          ]}
        >
          {isValid ? "✓ Valid" : "✗ Invalid"} | Touched:{" "}
          {isTouched ? "Yes" : "No"}
        </Text>
        <Text style={localStyles.validationDetailsText}>
          Pattern: {currentValidation.regex.toString()}
        </Text>
        <Text style={localStyles.validationDetailsText}>
          Required length: {currentValidation.length} digits
        </Text>
        <Text style={localStyles.validationDetailsText}>
          {validationDetails}
        </Text>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  errorText: {
    color: color.red,
    fontSize: windowHeight(12),
    marginTop: windowHeight(5),
  },
  helperText: {
    color: color.secondaryFont,
    fontSize: windowHeight(12),
    marginTop: windowHeight(5),
  },
  validationDetailsText: {
    color: color.secondaryFont,
    fontSize: windowHeight(12),
    marginTop: windowHeight(5),
  },
  debugBox: {
    marginTop: windowHeight(10),
    padding: windowHeight(10),
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: windowHeight(5),
    backgroundColor: color.lightGray,
  },
  debugTitle: {
    fontSize: windowHeight(14),
    fontWeight: "bold",
    marginBottom: windowHeight(5),
  },
});
