import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useState, useRef } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendOtp } from "../../services/api";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const isValid = isValidEmail(email);

  async function handleContinue() {
    if (!isValid || loading) return;
    setError("");
    setLoading(true);
    try {
      await sendOtp(email.trim().toLowerCase());
      router.push({ pathname: "/auth/otp", params: { email: email.trim().toLowerCase() } });
    } catch (e: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0C0E14" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 48 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, marginBottom: 10 }}>
              {[18, 28, 22, 14, 20].map((h, i) => (
                <View key={i} style={{ width: 5, height: h, backgroundColor: "#7B5CFA", borderRadius: 3 }} />
              ))}
            </View>
            <Text style={{ fontFamily: "Syne_700Bold", fontSize: 22, color: "#F0F2FF", letterSpacing: 3 }}>
              Voxly
            </Text>
          </View>

          <Text style={{ fontFamily: "Syne_700Bold", fontSize: 30, color: "#F0F2FF", marginBottom: 8 }}>
            What's your email?
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            We'll send you a one-time code to sign in.
          </Text>

          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1A1D27",
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(123,92,250,0.25)",
            marginBottom: 12,
          }}>
            <TextInput
              ref={inputRef}
              value={email}
              onChangeText={(t) => { setError(""); setEmail(t); }}
              placeholder="you@example.com"
              placeholderTextColor="#4B5563"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 18,
                fontFamily: "DMSans_400Regular",
                fontSize: 16,
                color: "#F0F2FF",
              }}
            />
          </View>

          {error ? (
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleContinue}
            disabled={!isValid || loading}
            style={{
              backgroundColor: isValid ? "#7B5CFA" : "#2A2D3A",
              borderRadius: 14,
              paddingVertical: 17,
              alignItems: "center",
              marginTop: error ? 0 : 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 17, color: isValid ? "#FFFFFF" : "#4B5563" }}>
                Continue
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={{
          textAlign: "center",
          fontFamily: "DMSans_400Regular",
          fontSize: 12,
          color: "#4B5563",
          lineHeight: 18,
          paddingHorizontal: 32,
          marginTop: 32,
        }}>
          By continuing you agree to our{" "}
          <Text style={{ color: "#7B5CFA" }}>Terms of Service</Text>
          {" "}and{" "}
          <Text style={{ color: "#7B5CFA" }}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
