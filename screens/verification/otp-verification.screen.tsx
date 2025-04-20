import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import AuthContainer from "@/utils/container/auth-container";
import { windowHeight } from "@/themes/app.constant";
import SignInText from "@/components/login/signin.text";
import OTPTextInput from "react-native-otp-textinput";
import { style } from "./style";
import color from "@/themes/app.colors";
import { external } from "@/styles/external.style";
import Button from "@/components/common/button";
import { router, useLocalSearchParams } from "expo-router";
import { commonStyles } from "@/styles/common.style";
import { useToast } from "react-native-toast-notifications";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState("");
  const [loader, setLoader] = useState(false);
  const toast = useToast();
  const { phoneNumber } = useLocalSearchParams();

  const handleSubmit = async () => {
    if (otp === "") {
      toast.show("Please fill the fields!", {
        placement: "bottom",
      });
      return;
    }

    setLoader(true);
    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/v1/verify-otp`,
        {
          phone_number: phoneNumber,
          otp,
        }
      );

      if (response.data.user.email === null) {
        router.push({
          pathname: "/(routes)/registration",
          params: { user: JSON.stringify(response.data.user) },
        });
        toast.show("Account verified!");
      } else {
        await AsyncStorage.setItem("accessToken", response.data.accessToken);
        router.push("/(tabs)/home");
      }
    } catch (error) {
      if (error.response) {
        console.error("Server Error:", error.response.data);
        toast.show(
          error.response.data.message || "Invalid OTP. Please try again.",
          {
            type: "danger",
            placement: "bottom",
          }
        );
      } else if (error.request) {
        console.error("Network Error:", error.request);
        toast.show("Network error. Please check your connection.", {
          type: "danger",
          placement: "bottom",
        });
      } else {
        console.error("Error:", error.message);
        toast.show("An unexpected error occurred. Please try again later.", {
          type: "danger",
          placement: "bottom",
        });
      }
    } finally {
      setLoader(false);
    }
  };

  return (
    <AuthContainer
      topSpace={windowHeight(240)}
      imageShow={true}
      container={
        <View>
          <SignInText
            title={"OTP Verification"}
            subtitle={"Check your phone number for the otp!"}
          />
          <OTPTextInput
            handleTextChange={(code) => setOtp(code)}
            inputCount={4}
            textInputStyle={style.otpTextInput}
            tintColor={color.subtitle}
            autoFocus={false}
          />
          <View style={[external.mt_30]}>
            <Button
              title="Verify"
              onPress={() => handleSubmit()}
              disabled={loader}
            />
          </View>
          <View style={[external.mb_15]}>
            <View
              style={[
                external.pt_10,
                external.Pb_10,
                { flexDirection: "row", gap: 5, justifyContent: "center" },
              ]}
            >
              <Text style={[commonStyles.regularText]}>Not Received yet?</Text>
              <TouchableOpacity>
                <Text style={[style.signUpText, { color: "#000" }]}>
                  Resend it
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
    />
  );
}
