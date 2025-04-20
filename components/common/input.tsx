import {
  View,
  Text,
  KeyboardTypeOptions,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useState, useEffect } from "react";
import fonts from "@/themes/app.fonts";
import { windowHeight, windowWidth } from "@/themes/app.constant";
import color from "@/themes/app.colors";

interface InputProps {
  title: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  value?: string;
  warning?: string;
  onChangeText?: (text: string) => void;
  showWarning?: boolean;
  emailFormatWarning?: string;
  disabled?: boolean;
  required?: boolean;
  secureTextEntry?: boolean;
  validator?: (
    value: string
  ) => { isValid: boolean; message: string } | boolean;
  testID?: string;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export default function Input({
  title,
  placeholder,
  keyboardType,
  value = "",
  warning,
  onChangeText,
  showWarning,
  emailFormatWarning,
  disabled = false,
  required = false,
  secureTextEntry = false,
  validator,
  testID,
  maxLength,
  autoCapitalize = "sentences",
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(!secureTextEntry);
  const [localValue, setLocalValue] = useState(value);
  const [touched, setTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Run validation on value change
  useEffect(() => {
    if (validator && touched) {
      const result = validator(localValue);
      if (typeof result === "boolean") {
        setValidationResult({
          isValid: result,
          message: result ? "" : warning || "Invalid input",
        });
      } else {
        setValidationResult(result);
      }
    }
  }, [localValue, touched, validator, warning]);

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    if (onChangeText) {
      onChangeText(text);
    }
    if (!touched) {
      setTouched(true);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Show clear button for non-empty fields when focused
  const showClearButton = isFocused && localValue.length > 0 && !disabled;

  // Combined error message logic
  const errorMessage =
    showWarning && warning
      ? warning
      : emailFormatWarning
      ? emailFormatWarning
      : !validationResult.isValid && touched
      ? validationResult.message
      : "";

  const showError = Boolean(errorMessage && touched);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
          {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: disabled
                ? color.disabledBackground
                : color.lightGray,
              borderColor: showError
                ? color.red
                : isFocused
                ? color.buttonBg
                : colors.border,
              color: disabled ? color.disabledText : color.secondaryFont,
              paddingRight:
                secureTextEntry || showClearButton
                  ? windowWidth(40)
                  : windowWidth(10),
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={color.secondaryFont}
          keyboardType={keyboardType}
          value={localValue}
          onChangeText={handleChangeText}
          editable={!disabled}
          selectTextOnFocus={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTouched(true);
          }}
          secureTextEntry={secureTextEntry && !passwordVisible}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          testID={`${testID}-input`}
        />

        {/* Show either clear button or password toggle */}
        {showClearButton && !secureTextEntry && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleChangeText("")}
            testID={`${testID}-clear`}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {secureTextEntry && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
            testID={`${testID}-toggle-password`}
          >
            <Text style={styles.passwordToggleText}>
              {passwordVisible ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        )}

        {isLoading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color={color.buttonBg}
          />
        )}
      </View>
      {/* Error message */}
      {showError && (
        <Text style={styles.warning} testID={`${testID}-error`}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: windowHeight(15),
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: windowHeight(5),
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: windowWidth(20),
    marginVertical: windowHeight(8),
  },
  requiredStar: {
    color: color.red,
    fontSize: windowWidth(18),
    marginLeft: 3,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderRadius: 5,
    borderWidth: 1,
    height: windowHeight(45),
    paddingHorizontal: windowWidth(10),
    fontSize: windowWidth(16),
    fontFamily: fonts.regular,
  },
  clearButton: {
    position: "absolute",
    right: windowWidth(10),
    top: 0,
    bottom: 0,
    justifyContent: "center",
    width: windowWidth(30),
    alignItems: "center",
  },
  clearButtonText: {
    color: color.secondaryFont,
    fontSize: windowWidth(16),
  },
  passwordToggle: {
    position: "absolute",
    right: windowWidth(10),
    top: 0,
    bottom: 0,
    justifyContent: "center",
    width: windowWidth(30),
    alignItems: "center",
  },
  passwordToggleText: {
    color: color.buttonBg,
    fontSize: windowWidth(14),
    fontFamily: fonts.medium,
  },
  loadingIndicator: {
    position: "absolute",
    right: windowWidth(15),
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  warning: {
    color: color.red,
    marginTop: windowHeight(5),
    fontFamily: fonts.regular,
    fontSize: windowWidth(12),
  },
});
