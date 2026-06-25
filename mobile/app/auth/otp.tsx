import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { verifyOtp, sendOtp } from "../../services/api";
import { useAuth } from "../../contexts/auth";

const CODE_LENGTH = 6;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const code = digits.join("");
  const isComplete = code.length === CODE_LENGTH;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleDigitChange(value: string, index: number) {
    setError("");
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      const next = Array(CODE_LENGTH).fill("");
      cleaned.split("").forEach((d, i) => {
        if (i < CODE_LENGTH) next[i] = d;
      });
      setDigits(next);
      inputRefs.current[Math.min(cleaned.length - 1, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!isComplete || loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await verifyOtp(email!, code);
      await signIn(result.access_token, result.refresh_token, result.user);
      router.replace("/home");
    } catch {
      setError("Incorrect code. Please try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setResendCooldown(30);
    try {
      await sendOtp(email!);
    } catch {
      setError("Couldn't resend code. Try again.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0C0E14" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, paddingTop: insets.top + 16 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginHorizontal: 20, marginBottom: 40,
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: "#1A1D27",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#F0F2FF" />
        </Pressable>

        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={{ fontFamily: "Syne_700Bold", fontSize: 30, color: "#F0F2FF", marginBottom: 8 }}>
            Enter the code
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            Sent to {email}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                value={d}
                onChangeText={(v) => handleDigitChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                selectTextOnFocus
                style={{
                  flex: 1, aspectRatio: 1,
                  backgroundColor: "#1A1D27",
                  borderRadius: 14, borderWidth: 1.5,
                  borderColor: error ? "rgba(239,68,68,0.5)" : d ? "#7B5CFA" : "rgba(123,92,250,0.2)",
                  textAlign: "center",
                  fontFamily: "Syne_700Bold", fontSize: 22, color: "#F0F2FF",
                }}
              />
            ))}
          </View>

          {error ? (
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleVerify}
            disabled={!isComplete || loading}
            style={{
              backgroundColor: isComplete ? "#7B5CFA" : "#2A2D3A",
              borderRadius: 14, paddingVertical: 17, alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 17, color: isComplete ? "#FFFFFF" : "#4B5563" }}>
                Verify
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0}
            style={{ alignSelf: "center", marginTop: 24 }}
          >
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: resendCooldown > 0 ? "#4B5563" : "#7B5CFA" }}>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
