import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState, useRef } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkPhone, sendOtp } from "../../services/api";

const COUNTRY_CODE = "+91";

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const formatted = phone.replace(/\D/g, "").slice(0, 10);
  const isValid = formatted.length === 10;

  function formatDisplay(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  }

  async function handleContinue() {
    if (!isValid || loading) return;
    setError("");
    setLoading(true);
    const fullPhone = `${COUNTRY_CODE}${formatted}`;
    try {
      const { exists } = await checkPhone(fullPhone);
      if (exists) {
        router.push({ pathname: "/auth/login", params: { phone: fullPhone } });
      } else {
        await sendOtp(fullPhone);
        router.push({ pathname: "/auth/otp", params: { phone: fullPhone, mode: "register" } });
      }
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
          {/* Logo mark */}
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

          {/* Heading */}
          <Text style={{ fontFamily: "Syne_700Bold", fontSize: 30, color: "#F0F2FF", marginBottom: 8 }}>
            What's your number?
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            Enter your number to sign in or create an account.
          </Text>

          {/* Input row */}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1A1D27",
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(123,92,250,0.25)",
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            {/* Country code badge */}
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 18,
              borderRightWidth: 1,
              borderRightColor: "rgba(255,255,255,0.07)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}>
              <Text style={{ fontSize: 18 }}>🇮🇳</Text>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 16, color: "#F0F2FF" }}>
                {COUNTRY_CODE}
              </Text>
            </View>

            {/* Number input */}
            <TextInput
              ref={inputRef}
              value={formatDisplay(phone)}
              onChangeText={(t) => {
                setError("");
                setPhone(t.replace(/\D/g, "").slice(0, 10));
              }}
              placeholder="98765 43210"
              placeholderTextColor="#4B5563"
              keyboardType="phone-pad"
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
          </Pressable>

          {/* Inline error */}
          {error ? (
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
              {error}
            </Text>
          ) : null}

          {/* Continue button */}
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
              <Text style={{
                fontFamily: "DMSans_500Medium",
                fontSize: 17,
                color: isValid ? "#FFFFFF" : "#4B5563",
              }}>
                Continue
              </Text>
            )}
          </Pressable>
        </View>

        {/* Terms */}
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
