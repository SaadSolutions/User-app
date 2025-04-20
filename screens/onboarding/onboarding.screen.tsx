import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import React from "react";
import color from "@/themes/app.colors";
import Swiper from "react-native-swiper";
import { styles } from "./styles";
import { slides } from "@/configs/constants";
import Images from "@/utils/images";
import { router } from "expo-router";
import { BackArrow } from "@/utils/icons";
import i18n from "@/utils/i18n";

export default function OnBoardingScreen() {
  // Modified slides with i18n translations
  const localizedSlides = [
    {
      ...slides[0],
      text: i18n.t("onboarding1"),
    },
    {
      ...slides[1],
      text: i18n.t("onboarding2"),
    },
    {
      ...slides[2],
      text: i18n.t("onboarding3"),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: color.whiteColor }}>
      <Swiper
        activeDotStyle={styles.activeStyle}
        removeClippedSubviews={true}
        paginationStyle={styles.paginationStyle}
      >
        {localizedSlides.map((slide: any, index: number) => (
          <View style={[styles.slideContainer]} key={index}>
            <Image style={styles.imageBackground} source={slide.image} />
            <View style={[styles.imageBgView]}>
              <ImageBackground
                resizeMode="stretch"
                style={styles.img}
                source={Images.bgOnboarding}
              >
                <Text style={styles.title}>{slide.text}</Text>
                <Text style={styles.description}>{slide.description}</Text>
                <TouchableOpacity
                  style={styles.backArrow}
                  onPress={() => router.push("/(routes)/login")}
                >
                  <BackArrow colors={color.whiteColor} width={21} height={21} />
                </TouchableOpacity>
              </ImageBackground>
            </View>
          </View>
        ))}
      </Swiper>
    </View>
  );
}
