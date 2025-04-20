import { View, Text, Linking, Button, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { fontSizes, windowHeight, windowWidth } from "@/themes/app.constant";
import MapView, { Marker, Polyline } from "react-native-maps";
import axios from "axios";
import color from "@/themes/app.colors";
import i18n from "@/utils/i18n";

// Custom component to replace MapViewDirections
const SecureMapDirections = ({ origin, destination }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  useEffect(() => {
    const fetchDirections = async () => {
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

    if (origin && destination) {
      fetchDirections();
    }
  }, [origin, destination]);

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

  return routeCoordinates.length > 0 ? (
    <Polyline
      coordinates={routeCoordinates}
      strokeWidth={4}
      strokeColor="blue"
    />
  ) : null;
};

export default function RideDetailsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState<any>({});
  const [region, setRegion] = useState({
    latitude: 23.8103,
    longitude: 90.4125,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const params = useLocalSearchParams();

  useEffect(() => {
    try {
      if (params.orderData) {
        const parsedData = JSON.parse(params.orderData as string);
        setOrderData(parsedData);

        // Set region based on driver location or current location
        if (parsedData.driver?.currentLocation || parsedData.currentLocation) {
          const location =
            parsedData.driver?.currentLocation || parsedData.currentLocation;
          setRegion({
            ...region,
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }

        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Error parsing order data:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [params]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const currentLocation =
    orderData.driver?.currentLocation || orderData.currentLocation;
  const destinationMarker = orderData.driver?.marker || orderData.marker;
  const driverInfo = orderData.driver || {};

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          {destinationMarker && <Marker coordinate={destinationMarker} />}
          {currentLocation && <Marker coordinate={currentLocation} />}
          {currentLocation && destinationMarker && (
            <SecureMapDirections
              origin={currentLocation}
              destination={destinationMarker}
            />
          )}
        </MapView>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.driverName}>
          {i18n.t("driverName", {
            name: driverInfo.name || i18n.t("driverNotProvided"),
          })}
        </Text>
        <View style={styles.phoneRow}>
          <Text style={styles.phoneLabel}>{i18n.t("phoneNumber")}:</Text>
          {driverInfo.phone_number ? (
            <Text
              style={styles.phoneNumber}
              onPress={() => Linking.openURL(`tel:${driverInfo.phone_number}`)}
            >
              {driverInfo.phone_number}
            </Text>
          ) : (
            <Text style={styles.unavailableText}>{i18n.t("notAvailable")}</Text>
          )}
        </View>
        <Text style={styles.vehicleInfo}>
          {i18n.t("vehicleInfo", {
            type: driverInfo.vehicle_type || i18n.t("car"),
            color: driverInfo.vehicle_color || i18n.t("notAvailable"),
          })}
        </Text>
        <Text style={styles.paymentInfo}>
          {i18n.t("payableAmount", {
            amount:
              driverInfo.distance && driverInfo.rate
                ? (
                    parseFloat(driverInfo.distance) * parseInt(driverInfo.rate)
                  ).toFixed(2)
                : orderData.distance && driverInfo.rate
                ? (
                    parseFloat(orderData.distance) * parseInt(driverInfo.rate)
                  ).toFixed(2)
                : "Calculating...",
          })}
        </Text>
        <Text style={styles.paymentNote}>{i18n.t("paymentNote")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: windowHeight(450),
  },
  map: {
    flex: 1,
  },
  detailsContainer: {
    padding: windowWidth(20),
  },
  driverName: {
    fontSize: fontSizes.FONT20,
    fontWeight: "500",
    paddingVertical: windowHeight(5),
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneLabel: {
    fontSize: fontSizes.FONT20,
    fontWeight: "500",
    paddingVertical: windowHeight(5),
  },
  phoneNumber: {
    color: color.buttonBg,
    paddingLeft: 5,
    fontSize: fontSizes.FONT20,
    fontWeight: "500",
    paddingVertical: windowHeight(5),
  },
  unavailableText: {
    paddingLeft: 5,
    fontSize: fontSizes.FONT20,
    fontWeight: "400",
    paddingVertical: windowHeight(5),
    fontStyle: "italic",
    color: "#999",
  },
  vehicleInfo: {
    fontSize: fontSizes.FONT20,
    fontWeight: "500",
  },
  paymentInfo: {
    fontSize: fontSizes.FONT20,
    fontWeight: "500",
    paddingVertical: windowHeight(5),
  },
  paymentNote: {
    fontSize: fontSizes.FONT14,
    fontWeight: "400",
    paddingVertical: windowHeight(5),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: fontSizes.FONT18,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: fontSizes.FONT18,
    fontWeight: "500",
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
});
