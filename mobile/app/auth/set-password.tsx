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
import { registerWithPassword, resetPassword } from "../../services/api";
import { useAuth } from "../../contexts/auth";

function StrengthBar({ password }: { password: string }) {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /\d/.test(password);
  const score = Math.min(3, (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0));
  const colors = ["#EF4444", "#F59E0B", "#34D399"];
  const labels = ["Weak", "Fair", "Strong"];
  if (!password) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 4 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < score ? colors[score - 1] : "#2A2D3A",
          }}
        />
      ))}
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors[score - 1] ?? "#4B5563", minWidth: 44 }}>
        {score > 0 ? labels[score - 1] : ""}
      </Text>
    </View>
  );
}

export default function SetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode: string }>();
  const isReset = mode === "reset";
  const { signIn } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef<TextInput>(null);

  const mismatch = confirm.length > 0 && password !== confirm;
  const isValid = password.length >= 8 && password === confirm;

  async function handleCreate() {
    if (!isValid || loading) return;
    setError("");
    setLoading(true);
    try {
      const { token, user } = isReset
        ? await resetPassword(phone!, password)
        : await registerWithPassword(phone!, password);
      await signIn(token, user);
      router.replace("/home");
    } catch (e: any) {
      setError(isReset ? "Couldn't reset password. Try again." : "Couldn't create account. Please try again.");
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
            marginBottom: 40,
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
          {/* Heading */}
          <Text style={{ fontFamily: "Syne_700Bold", fontSize: 30, color: "#F0F2FF", marginBottom: 8 }}>
            {isReset ? "Reset password" : "Create your account"}
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            {isReset ? `Set a new password for ${phone}` : `Set a password for ${phone}`}
          </Text>

          {/* New password */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1A1D27",
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: "rgba(123,92,250,0.25)",
            marginBottom: 4,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={{ marginLeft: 16 }} />
            <TextInput
              value={password}
              onChangeText={(t) => { setError(""); setPassword(t); }}
              placeholder="New password"
              placeholderTextColor="#4B5563"
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
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

          <StrengthBar password={password} />

          {/* Confirm password */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1A1D27",
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: mismatch ? "rgba(239,68,68,0.5)" : "rgba(123,92,250,0.25)",
            marginTop: 12,
            marginBottom: 8,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={{ marginLeft: 16 }} />
            <TextInput
              ref={confirmRef}
              value={confirm}
              onChangeText={(t) => { setError(""); setConfirm(t); }}
              placeholder="Confirm password"
              placeholderTextColor="#4B5563"
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
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
              onPress={() => setShowConfirm((v) => !v)}
              style={{ paddingRight: 16, paddingLeft: 8 }}
            >
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6B7280"
              />
            </Pressable>
          </View>

          {mismatch && (
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#EF4444", marginBottom: 4 }}>
              Passwords don't match
            </Text>
          )}
          {error ? (
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#EF4444", marginBottom: 4 }}>
              {error}
            </Text>
          ) : null}

          {/* Hint */}
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: "#4B5563", marginTop: 4, marginBottom: 28 }}>
            At least 8 characters
          </Text>

          {/* Create account button */}
          <Pressable
            onPress={handleCreate}
            disabled={!isValid || loading}
            style={{
              backgroundColor: isValid ? "#7B5CFA" : "#2A2D3A",
              borderRadius: 14,
              paddingVertical: 17,
              alignItems: "center",
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
                {isReset ? "Reset password" : "Create account"}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
