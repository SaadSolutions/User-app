import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError } from "axios";
import { useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";

export const useGetUserData = (options = { autoLogout: true }) => {
  const [user, setUser] = useState<UserType | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 3;

  // Create a function to handle logout in case of auth errors
  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("accessToken");
      // Additional cleanup if needed
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, []);

  // Function to fetch user data with retry logic
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from storage
      const accessToken = await AsyncStorage.getItem("accessToken");

      // If no token, early return
      if (!accessToken) {
        setLoading(false);
        setError("No authentication token found");
        return;
      }

      console.log(
        "Fetching user data with token:",
        accessToken.substring(0, 10) + "..."
      );

      // Make API request - Fixed the URL to include the proper path
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/v1/user/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Set user data on success
      setUser(response.data.user);
      setLoading(false);
      setRetries(0); // Reset retry counter on success
      console.log("User data fetched successfully");
    } catch (err) {
      const error = err as AxiosError;

      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          setError("Authentication failed. Please login again.");
          if (options.autoLogout) {
            Alert.alert(
              "Session Expired",
              "Your session has expired. Please login again.",
              [{ text: "OK" }]
            );
            await handleLogout();
          }
        } else {
          setError(`Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        if (retries < MAX_RETRIES) {
          // Retry the request
          setRetries((prev) => prev + 1);
          setTimeout(fetchUserData, 1000 * retries); // Exponential backoff
          return;
        } else {
          setError("Network error. Please check your connection.");
        }
      } else {
        // Something happened in setting up the request
        setError("An unexpected error occurred.");
      }

      console.error("Error fetching user data:", err);
      setLoading(false);
    }
  }, [retries, handleLogout, options.autoLogout]);

  // Initialize data fetch on component mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Expose a refetch method to manually trigger data refresh
  const refetch = useCallback(() => {
    setRetries(0); // Reset retry counter
    return fetchUserData();
  }, [fetchUserData]);

  return { loading, user, error, refetch };
};
