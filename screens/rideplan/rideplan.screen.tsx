import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import styles from "./styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { external } from "@/styles/external.style";
import { windowHeight, windowWidth } from "@/themes/app.constant";
import MapView, { Marker, Polyline } from "react-native-maps";
import { router } from "expo-router";
import { Clock, LeftArrow, PickLocation, PickUpLocation } from "@/utils/icons";
import color from "@/themes/app.colors";
import DownArrow from "@/assets/icons/downArrow";
import PlaceHolder from "@/assets/icons/placeHolder";
import _ from "lodash";
import axios from "axios";
import * as Location from "expo-location";
import { Toast } from "react-native-toast-notifications";
import moment from "moment";
import { parseDuration } from "@/utils/time/parse.duration";
import Button from "@/components/common/button";
import { useGetUserData } from "@/hooks/useGetUserData";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import i18n from "@/utils/i18n";

export default function RidePlanScreen() {
  const { user } = useGetUserData();
  const ws = useRef<any>(null);
  const notificationListener = useRef<any>();
  const [wsConnected, setWsConnected] = useState(false);
  const [places, setPlaces] = useState<any>([]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<any>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [marker, setMarker] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [distance, setDistance] = useState<any>(null);
  const [locationSelected, setlocationSelected] = useState(false);
  const [selectedVehcile, setselectedVehcile] = useState("Car");
  const [travelTimes, setTravelTimes] = useState({
    driving: null,
    walking: null,
    bicycling: null,
    transit: null,
  });
  const [keyboardAvoidingHeight, setkeyboardAvoidingHeight] = useState(false);
  const [driverLists, setdriverLists] = useState([]);
  const [selectedDriver, setselectedDriver] = useState<DriverType>();
  const [driverLoader, setdriverLoader] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  useEffect(() => {
    // Debug logging to verify API key is loaded
    console.log(
      "API Key available:",
      !!process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY
    );
    // Log beginning of the API key to verify it's the right one without exposing full key
    if (process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY) {
      const key = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY;
      console.log("API Key starts with:", key.substring(0, 8) + "...");
    }
  }, []);

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "Notification received:",
          JSON.stringify(notification.request.content.data)
        );

        try {
          // Extract data from notification
          const notificationData = notification.request.content.data;

          // Create a clean orderData object with proper structure
          const orderData = {
            // Use direct properties from notification data if available
            currentLocation: notificationData.currentLocation || null,
            marker: notificationData.marker || null,
            distance: notificationData.distance || "0",
            driver: null, // Initialize as null, will be set properly below
          };

          // Handle driver data with care
          let driverData = notificationData.orderData;
          console.log("Raw driver data type:", typeof driverData);

          if (typeof driverData === "string") {
            try {
              console.log("Attempting to parse driver data string");
              driverData = JSON.parse(driverData);
              console.log("Successfully parsed driver data");
            } catch (error) {
              console.error("Error parsing driver data:", error);
              driverData = { error: "Failed to parse driver data" };
            }
          }

          // Assign the properly processed driver data
          orderData.driver = driverData;

          console.log(
            "Final orderData structure:",
            "Has currentLocation:",
            !!orderData.currentLocation,
            "Has marker:",
            !!orderData.marker,
            "Has distance:",
            !!orderData.distance,
            "Has driver:",
            !!orderData.driver
          );

          // Navigate to ride details with the prepared data
          router.push({
            pathname: "/(routes)/ride-details",
            params: {
              orderData: JSON.stringify(orderData),
            },
          });
        } catch (error) {
          console.error("Error processing notification data:", error);
          // Navigate with error information
          router.push({
            pathname: "/(routes)/ride-details",
            params: {
              orderData: JSON.stringify({
                error: "Failed to process notification data",
              }),
            },
          });
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
    };
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show(
          "Please approve your location tracking otherwise you can't use this app!",
          {
            type: "danger",
            placement: "bottom",
          }
        );
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  const initializeWebSocket = () => {
    ws.current = new WebSocket("ws://192.168.1.2:8080");
    ws.current.onopen = () => {
      console.log("Connected to websocket server");
      setWsConnected(true);
    };

    ws.current.onerror = (e: any) => {
      console.log("WebSocket error:", e.message);
    };

    ws.current.onclose = (e: any) => {
      console.log("WebSocket closed:", e.code, e.reason);
      setWsConnected(false);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        initializeWebSocket();
      }, 5000);
    };
  };

  useEffect(() => {
    initializeWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        Toast.show("Failed to get push token for push notification!", {
          type: "danger",
        });
        return;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        Toast.show("Failed to get project id for push notification!", {
          type: "danger",
        });
      }
      try {
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log(pushTokenString);
        // return pushTokenString;
      } catch (e: unknown) {
        Toast.show(`${e}`, {
          type: "danger",
        });
      }
    } else {
      Toast.show("Must use physical device for Push Notifications", {
        type: "danger",
      });
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  }

  const fetchPlaces = async (input: any) => {
    try {
      console.log("Calling Places Autocomplete API...");
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input,
            key: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY,
            language: "en",
          },
        }
      );
      if (response.data.status && response.data.status !== "OK") {
        console.log(
          "Places Autocomplete API error:",
          response.data.status,
          response.data.error_message
        );
      } else {
        console.log("Places Autocomplete API success");
      }
      setPlaces(response.data.predictions);
    } catch (error) {
      console.log("Places Autocomplete API error:", error);
    }
  };

  const debouncedFetchPlaces = useCallback(_.debounce(fetchPlaces, 100), []);

  useEffect(() => {
    if (query.length > 2) {
      debouncedFetchPlaces(query);
    } else {
      setPlaces([]);
    }
  }, [query, debouncedFetchPlaces]);

  const handleInputChange = (text: any) => {
    setQuery(text);
  };

  const fetchTravelTimes = async (origin: any, destination: any) => {
    const modes = ["driving", "walking", "bicycling", "transit"];
    let travelTimes = {
      driving: null,
      walking: null,
      bicycling: null,
      transit: null,
    } as any;

    for (const mode of modes) {
      let params = {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        key: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!,
        mode: mode,
      } as any;

      if (mode === "driving") {
        params.departure_time = "now";
      }

      try {
        console.log(`Calling Distance Matrix API with mode: ${mode}...`);
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/distancematrix/json`,
          { params }
        );

        if (response.data.status && response.data.status !== "OK") {
          console.log(
            `Distance Matrix API (${mode}) error:`,
            response.data.status,
            response.data.error_message
          );
        } else {
          console.log(`Distance Matrix API (${mode}) success`);
        }

        const elements = response.data.rows[0].elements[0];
        if (elements.status === "OK") {
          travelTimes[mode] = elements.duration.text;
        } else {
          console.log(
            `Distance Matrix API element status (${mode}):`,
            elements.status
          );
        }
      } catch (error) {
        console.log(`Distance Matrix API (${mode}) error:`, error);
      }
    }

    setTravelTimes(travelTimes);
  };

  const handlePlaceSelect = async (placeId: any) => {
    try {
      console.log("Calling Place Details API...");
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            key: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY,
          },
        }
      );

      if (response.data.status && response.data.status !== "OK") {
        console.log(
          "Place Details API error:",
          response.data.status,
          response.data.error_message
        );
      } else {
        console.log("Place Details API success");
      }

      const { lat, lng } = response.data.result.geometry.location;

      const selectedDestination = { latitude: lat, longitude: lng };
      setRegion({
        ...region,
        latitude: lat,
        longitude: lng,
      });
      setMarker({
        latitude: lat,
        longitude: lng,
      });
      setPlaces([]);
      requestNearbyDrivers();
      setlocationSelected(true);
      setkeyboardAvoidingHeight(false);
      if (currentLocation) {
        await fetchTravelTimes(currentLocation, selectedDestination);
      }
    } catch (error) {
      console.log("Place Details API error:", error);
    }
  };

  const calculateDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a =
      0.5 -
      c((lat2 - lat1) * p) / 2 +
      (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  };

  const getEstimatedArrivalTime = (travelTime: any) => {
    const now = moment();
    const travelMinutes = parseDuration(travelTime);
    const arrivalTime = now.add(travelMinutes, "minutes");
    return arrivalTime.format("hh:mm A");
  };

  useEffect(() => {
    if (marker && currentLocation) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        marker.latitude,
        marker.longitude
      );
      setDistance(dist);

      // Fetch directions through backend proxy
      fetchDirections(currentLocation, marker);
    }
  }, [marker, currentLocation]);

  // Function to fetch directions from our backend proxy
  const fetchDirections = async (origin, destination) => {
    try {
      // Call our backend proxy API instead of Google directly
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/v1/directions`,
        {
          params: {
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
          },
        }
      );

      if (
        response.data.success &&
        response.data.data.routes &&
        response.data.data.routes.length > 0
      ) {
        // Google directions returns an encoded polyline
        // Decode the polyline and set route coordinates
        const points = decodePolyline(
          response.data.data.routes[0].overview_polyline.points
        );
        setRouteCoordinates(points);
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
    }
  };

  // Helper function to decode Google's polyline encoding
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  const getNearbyDrivers = () => {
    ws.current.onmessage = async (e: any) => {
      try {
        const message = JSON.parse(e.data);
        if (message.type === "nearbyDrivers") {
          await getDriversData(message.drivers);
        }
      } catch (error) {
        console.log(error, "Error parsing websocket");
      }
    };
  };

  const getDriversData = async (drivers: any) => {
    // Extract driver IDs from the drivers array
    const driverIds = drivers.map((driver: any) => driver.id).join(",");
    const response = await axios.get(
      `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/get-drivers-data`,
      {
        params: { ids: driverIds },
      }
    );

    const driverData = response.data;
    setdriverLists(driverData);
    setdriverLoader(false);
  };

  const requestNearbyDrivers = () => {
    console.log(wsConnected);
    if (currentLocation && wsConnected) {
      ws.current.send(
        JSON.stringify({
          type: "requestRide",
          role: "user",
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        })
      );
      getNearbyDrivers();
    }
  };

  const sendPushNotification = async (expoPushToken: string, data: any) => {
    console.log(
      "Sending push notification with data:",
      "Type of data:",
      typeof data,
      "Has user:",
      !!data.user,
      "Has currentLocation:",
      !!data.currentLocation,
      "Has marker:",
      !!data.marker
    );

    const message = {
      to: expoPushToken,
      sound: "default",
      title: "New Ride Request",
      body: "You have a new ride request.",
      data: {
        orderData: data,
        currentLocation,
        marker,
        distance: distance ? distance.toFixed(2) : "0",
      },
    };

    console.log(
      "Push notification prepared:",
      "Message data type:",
      typeof message.data,
      "orderData type:",
      typeof message.data.orderData
    );

    try {
      const response = await axios.post(
        "https://exp.host/--/api/v2/push/send",
        message
      );
      console.log("Push notification sent successfully");
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  };

  const handleOrder = async () => {
    try {
      console.log("Starting order process");
      const currentLocationName = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${currentLocation?.latitude},${currentLocation?.longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY}`
      );
      const destinationLocationName = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${marker?.latitude},${marker?.longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY}`
      );

      const data = {
        user: {
          id: user?.id,
          name: user?.name,
          phone_number: user?.phone_number,
        },
        currentLocation: {
          latitude: parseFloat(currentLocation?.latitude),
          longitude: parseFloat(currentLocation?.longitude),
        },
        marker: {
          latitude: parseFloat(marker?.latitude),
          longitude: parseFloat(marker?.longitude),
        },
        distance: distance ? distance.toFixed(2) : "0",
        currentLocationName:
          currentLocationName.data.results[0].formatted_address,
        destinationLocation:
          destinationLocationName.data.results[0].formatted_address,
        driver: selectedDriver,
      };

      console.log(
        "Order data prepared:",
        "Has user:",
        !!data.user,
        "Has currentLocation:",
        !!data.currentLocation,
        "Has marker:",
        !!data.marker,
        "Has distance:",
        !!data.distance,
        "Has driver info:",
        !!data.driver
      );

      const driverPushToken = "ExponentPushToken[v1e34ML-hnypD7MKQDDwaK]";

      // Test the route with the same data format without sending a notification
      // This helps verify if our data structure works correctly
      router.push({
        pathname: "/(routes)/ride-details",
        params: { orderData: JSON.stringify(data) },
      });

      // Uncomment to actually send notification
      // await sendPushNotification(driverPushToken, data);

      console.log("Order process completed - route pushed");
    } catch (error) {
      console.error("Error in handleOrder:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[external.fx_1]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View>
        <View
          style={{ height: windowHeight(!keyboardAvoidingHeight ? 500 : 300) }}
        >
          <MapView
            style={{ flex: 1 }}
            region={region}
            onRegionChangeComplete={(region) => setRegion(region)}
          >
            {marker && <Marker coordinate={marker} />}
            {currentLocation && <Marker coordinate={currentLocation} />}
            {currentLocation && marker && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={4}
                strokeColor="blue"
              />
            )}
          </MapView>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <View style={[styles.container]}>
          {locationSelected ? (
            <>
              {driverLoader ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    height: 400,
                  }}
                >
                  <ActivityIndicator size={"large"} />
                </View>
              ) : (
                <ScrollView
                  style={{
                    paddingBottom: windowHeight(20),
                    height: windowHeight(280),
                  }}
                >
                  <View
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: "#b5b5b5",
                      paddingBottom: windowHeight(10),
                      flexDirection: "row",
                    }}
                  >
                    <Pressable onPress={() => setlocationSelected(false)}>
                      <LeftArrow />
                    </Pressable>
                    <Text
                      style={{
                        margin: "auto",
                        fontSize: 20,
                        fontWeight: "600",
                      }}
                    >
                      Gathering options
                    </Text>
                  </View>
                  <View style={{ padding: windowWidth(10) }}>
                    {driverLists?.map((driver: DriverType) => (
                      <Pressable
                        style={{
                          width: windowWidth(420),
                          borderWidth:
                            selectedVehcile === driver.vehicle_type ? 2 : 0,
                          borderRadius: 10,
                          padding: 10,
                          marginVertical: 5,
                        }}
                        onPress={() => {
                          setselectedVehcile(driver.vehicle_type);
                        }}
                      >
                        <View style={{ margin: "auto" }}>
                          <Image
                            source={
                              driver?.vehicle_type === "Car"
                                ? require("@/assets/images/vehicles/car.png")
                                : driver?.vehicle_type === "Motorcycle"
                                ? require("@/assets/images/vehicles/bike.png")
                                : require("@/assets/images/vehicles/bike.png")
                            }
                            style={{ width: 90, height: 80 }}
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 20, fontWeight: "600" }}>
                              {i18n.t("appName")} {driver?.vehicle_type}
                            </Text>
                            <Text style={{ fontSize: 16 }}>
                              {getEstimatedArrivalTime(travelTimes.driving)}{" "}
                              {i18n.t("dropoff")}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: windowWidth(20),
                              fontWeight: "600",
                            }}
                          >
                            BDT{" "}
                            {(
                              distance.toFixed(2) * parseInt(driver.rate)
                            ).toFixed(2)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}

                    <View
                      style={{
                        paddingHorizontal: windowWidth(10),
                        marginTop: windowHeight(15),
                      }}
                    >
                      <Button
                        backgroundColor={"#000"}
                        textColor="#fff"
                        title={`Confirm Booking`}
                        onPress={() => handleOrder()}
                      />
                    </View>
                  </View>
                </ScrollView>
              )}
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity onPress={() => router.back()}>
                  <LeftArrow />
                </TouchableOpacity>
                <Text
                  style={{
                    margin: "auto",
                    fontSize: windowWidth(25),
                    fontWeight: "600",
                  }}
                >
                  {i18n.t("planYourRide")}
                </Text>
              </View>
              {/* picking up time */}
              <View
                style={{
                  width: windowWidth(200),
                  height: windowHeight(28),
                  borderRadius: 20,
                  backgroundColor: color.lightGray,
                  alignItems: "center",
                  justifyContent: "center",
                  marginVertical: windowHeight(10),
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Clock />
                  <Text
                    style={{
                      fontSize: windowHeight(12),
                      fontWeight: "600",
                      paddingHorizontal: 8,
                    }}
                  >
                    {i18n.t("pickUpNow")}
                  </Text>
                  <DownArrow />
                </View>
              </View>
              {/* picking up location */}
              <View
                style={{
                  borderWidth: 2,
                  borderColor: "#000",
                  borderRadius: 15,
                  marginBottom: windowHeight(15),
                  paddingHorizontal: windowWidth(15),
                  paddingVertical: windowHeight(5),
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  <PickLocation />
                  <View
                    style={{
                      width: Dimensions.get("window").width * 1 - 110,
                      borderBottomWidth: 1,
                      borderBottomColor: "#999",
                      marginLeft: 5,
                      height: windowHeight(20),
                    }}
                  >
                    <Text
                      style={{
                        color: "#2371F0",
                        fontSize: 18,
                        paddingLeft: 5,
                      }}
                    >
                      Current Location
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    paddingVertical: 12,
                  }}
                >
                  <PlaceHolder />
                  <View
                    style={{
                      marginLeft: 5,
                      width: Dimensions.get("window").width * 1 - 110,
                    }}
                  >
                    <GooglePlacesAutocomplete
                      placeholder={i18n.t("whereTo")}
                      onPress={(data, details = null) => {
                        setkeyboardAvoidingHeight(true);
                        setPlaces([
                          {
                            description: data.description,
                            place_id: data.place_id,
                          },
                        ]);
                      }}
                      query={{
                        key: `${process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}`,
                        language: "en",
                      }}
                      styles={{
                        textInputContainer: {
                          width: "100%",
                        },
                        textInput: {
                          height: 38,
                          color: "#000",
                          fontSize: 16,
                        },
                        predefinedPlacesDescription: {
                          color: "#000",
                        },
                      }}
                      textInputProps={{
                        onChangeText: (text) => handleInputChange(text),
                        value: query,
                        onFocus: () => setkeyboardAvoidingHeight(true),
                      }}
                      onFail={(error) => console.log(error)}
                      fetchDetails={true}
                      debounce={200}
                    />
                  </View>
                </View>
              </View>
              {/* Last sessions */}
              {places.map((place: any, index: number) => (
                <Pressable
                  key={index}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: windowHeight(20),
                  }}
                  onPress={() => handlePlaceSelect(place.place_id)}
                >
                  <PickUpLocation />
                  <Text style={{ paddingLeft: 15, fontSize: 18 }}>
                    {place.description}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
