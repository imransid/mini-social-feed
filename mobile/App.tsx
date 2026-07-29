import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { useNotifications } from "./src/push/useNotifications";

export default function App() {
  // Mounted at the root so a tapped notification is handled from any screen,
  // and the foreground handler is installed before any notification arrives.
  useNotifications();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
