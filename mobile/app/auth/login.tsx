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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loginWithPassword, sendOtp } from "../../services/api";
import { useAuth } from "../../contexts/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useAuth();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  async function handleSignIn() {
    if (!password || loading) return;
    setError("");
    setLoading(true);
    try {
      const { token, user } = await loginWithPassword(phone!, password);
      await signIn(token, user);
      router.replace("/home");
    } catch (e: any) {
      setError("Incorrect password. Please try again.");
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
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            marginHorizontal: 20,
            marginBottom: 32,
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#1A1D27",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={20} color="#F0F2FF" />
        </Pressable>

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

          {/* Heading */}
          <Text style={{ fontFamily: "Syne_700Bold", fontSize: 30, color: "#F0F2FF", marginBottom: 12 }}>
            Welcome back
          </Text>

          {/* Phone chip */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
          }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#1A1D27",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
            }}>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: "#A78BFA" }}>
                {phone}
              </Text>
              <Pressable onPress={() => router.back()}>
                <Ionicons name="pencil" size={13} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          {/* Password input */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1A1D27",
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: error ? "rgba(239,68,68,0.5)" : "rgba(123,92,250,0.25)",
            marginBottom: 12,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={{ marginLeft: 16 }} />
            <TextInput
              ref={inputRef}
              value={password}
              onChangeText={(t) => { setError(""); setPassword(t); }}
              placeholder="Password"
              placeholderTextColor="#4B5563"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 18,
                fontFamily: "DMSans_400Regular",
                fontSize: 16,
                color: "#F0F2FF",
              }}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={{ paddingRight: 16, paddingLeft: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6B7280"
              />
            </Pressable>
          </View>

          {/* Error */}
          {error ? (
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
              {error}
            </Text>
          ) : null}

          {/* Sign in button */}
          <Pressable
            onPress={handleSignIn}
            disabled={!password || loading}
            style={{
              backgroundColor: password ? "#7B5CFA" : "#2A2D3A",
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
                color: password ? "#FFFFFF" : "#4B5563",
              }}>
                Sign in
              </Text>
            )}
          </Pressable>

          {/* Forgot password */}
          <Pressable
            onPress={async () => {
              setForgotLoading(true);
              setError("");
              try {
                await sendOtp(phone!);
                router.push({ pathname: "/auth/otp", params: { phone, mode: "reset" } });
              } catch {
                setError("Couldn't send code. Try again.");
              } finally {
                setForgotLoading(false);
              }
            }}
            disabled={forgotLoading}
            style={({ pressed }) => ({ alignSelf: "center", marginTop: 20, opacity: pressed ? 0.65 : 1 })}
          >
            {forgotLoading ? (
              <ActivityIndicator color="#7B5CFA" size="small" />
            ) : (
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: "#7B5CFA" }}>
                Forgot password?
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
