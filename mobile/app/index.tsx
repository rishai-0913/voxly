import { Animated, Easing, Text, View, Pressable } from "react-native";
import { useEffect, useRef, useState, useCallback } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "../components/Logo";
import { BASE_URL } from "../services/api";
import { useAuth } from "../contexts/auth";

type ApiStatus = "checking" | "warming" | "ok" | "error";

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 8000;
const TIMEOUT_MS = 55000;

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { token, isLoading: authLoading } = useAuth();

  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [animDone, setAnimDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const retryCount = useRef(0);

  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.82)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY       = useRef(new Animated.Value(14)).current;
  const taglineOpacity  = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const errorOpacity   = useRef(new Animated.Value(0)).current;
  const errorY         = useRef(new Animated.Value(16)).current;

  // Animation plays once — sets animDone when complete instead of auto-navigating
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoScale,   { toValue: 1, duration: 550, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(wordmarkY,       { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(600),
    ]).start(() => setAnimDone(true));
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const fetchPromise = fetch(`${BASE_URL}/health`);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      );
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (res.ok) {
        retryCount.current = 0;
        setApiStatus("ok");
      } else {
        throw new Error(`bad status ${res.status}`);
      }
    } catch (e: any) {
      console.log(`[health] attempt ${retryCount.current} failed — name:${e?.name} msg:${e?.message}`);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        setApiStatus("warming");
        setTimeout(checkHealth, RETRY_DELAY_MS);
      } else {
        setApiStatus("error");
        setErrorMsg("Can't reach the server. Check your connection and try again.");
      }
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  useEffect(() => {
    if (!animDone || apiStatus === "checking" || apiStatus === "warming" || authLoading) return;

    if (apiStatus === "ok") {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (token) {
          router.replace("/home");
        } else {
          router.replace("/auth/email");
        }
      });
    } else {
      Animated.parallel([
        Animated.timing(errorOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(errorY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [animDone, apiStatus]);

  const retry = useCallback(async () => {
    Animated.parallel([
      Animated.timing(errorOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(errorY,       { toValue: 16, duration: 180, useNativeDriver: true }),
    ]).start();
    retryCount.current = 0;
    setApiStatus("checking");
    await checkHealth();
  }, [checkHealth]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: "#0C0E14",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: insets.bottom,
        opacity: containerOpacity,
      }}
    >
      {/* Animated waveform logo */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          marginBottom: 24,
        }}
      >
        <Logo size={1.5} animated />
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text
        style={{
          opacity: wordmarkOpacity,
          transform: [{ translateY: wordmarkY }],
          fontFamily: "Syne_700Bold",
          fontSize: 42,
          letterSpacing: 4,
          color: "#F0F2FF",
          marginBottom: 10,
        }}
      >
        Voxly
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={{
          opacity: taglineOpacity,
          fontFamily: "DMSans_400Regular",
          fontSize: 13,
          letterSpacing: 0.5,
          color: "#6B7280",
        }}
      >
        Voice. Structured. Instant.
      </Animated.Text>

      {/* Warming up indicator */}
      {apiStatus === "warming" && (
        <Text style={{
          position: "absolute",
          bottom: insets.bottom + 44,
          fontFamily: "DMSans_400Regular",
          fontSize: 13,
          color: "#4B5563",
        }}>
          Warming up server…
        </Text>
      )}

      {/* Error banner — fades in from below if API unreachable */}
      <Animated.View
        style={{
          opacity: errorOpacity,
          transform: [{ translateY: errorY }],
          position: "absolute",
          bottom: insets.bottom + 44,
          left: 24,
          right: 24,
          backgroundColor: "rgba(239,68,68,0.09)",
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.28)",
          borderRadius: 14,
          padding: 16,
        }}
        pointerEvents={apiStatus === "error" ? "auto" : "none"}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" }} />
          <Text
            style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FCA5A5", flex: 1 }}
          >
            Server unreachable
          </Text>
        </View>

        <Text
          style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#9CA3AF", lineHeight: 19 }}
        >
          {errorMsg}
        </Text>

        <Pressable
          onPress={retry}
          style={({ pressed }) => ({
            marginTop: 14,
            alignSelf: "flex-start",
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: "#7B5CFA" }}>
            Retry
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
