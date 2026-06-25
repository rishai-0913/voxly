import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Syne_700Bold } from "@expo-google-fonts/syne";
import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";
import { ThemeProvider, useTheme } from "../contexts/theme";
import { AuthProvider } from "../contexts/auth";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: dark ? "#0C0E14" : "#F5F4FF" },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </AuthProvider>
  );
}
