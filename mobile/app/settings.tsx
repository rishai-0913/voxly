import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth";
import { getMe, updateMe, UserProfile } from "../services/api";

const STYLES: { key: UserProfile["summary_style"]; label: string; desc: string }[] = [
  { key: "concise", label: "Concise", desc: "Short summary, essential points only" },
  { key: "detailed", label: "Detailed", desc: "Full context, thorough breakdown" },
  { key: "action_focused", label: "Action-focused", desc: "Prioritises tasks and next steps" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    getMe().then((p) => {
      setProfile(p);
      setName(p.name);
    }).catch(() => {});
  }, []);

  async function saveName() {
    if (!profile) return;
    setEditingName(false);
    if (name === profile.name) return;
    setSaving(true);
    try {
      const updated = await updateMe({ name });
      setProfile(updated);
    } catch {}
    setSaving(false);
  }

  async function selectStyle(key: UserProfile["summary_style"]) {
    setStylePickerOpen(false);
    if (!profile || key === profile.summary_style) return;
    setSaving(true);
    try {
      const updated = await updateMe({ summary_style: key });
      setProfile(updated);
    } catch {}
    setSaving(false);
  }

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/phone");
        },
      },
    ]);
  }

  const currentStyle = STYLES.find((s) => s.key === profile?.summary_style) ?? STYLES[0];

  return (
    <View style={{ flex: 1, backgroundColor: "#0C0E14" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 32 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: "#1A1D27",
              alignItems: "center", justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#F0F2FF" />
          </Pressable>
          <Text style={{ fontFamily: "Syne_700Bold", fontSize: 26, color: "#F0F2FF", flex: 1 }}>
            Settings
          </Text>
          {saving && <ActivityIndicator color="#7B5CFA" size="small" />}
        </View>

        {/* ACCOUNT */}
        <Text style={sectionLabel}>ACCOUNT</Text>
        <View style={card}>
          {/* Name row */}
          <Pressable
            onPress={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); }}
            style={row}
          >
            <View style={iconWrap}>
              <Ionicons name="person-outline" size={18} color="#6B7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rowLabel}>Name</Text>
              {editingName ? (
                <TextInput
                  ref={nameInputRef}
                  value={name}
                  onChangeText={setName}
                  onBlur={saveName}
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                  placeholder="Your name"
                  placeholderTextColor="#4B5563"
                  style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: "#F0F2FF", paddingVertical: 0 }}
                />
              ) : (
                <Text style={[rowValue, !name && { color: "#4B5563", fontStyle: "italic" }]}>
                  {name || "Your name"}
                </Text>
              )}
            </View>
            <Ionicons name="pencil-outline" size={16} color="#4B5563" />
          </Pressable>

          <View style={divider} />

          {/* Phone row */}
          <View style={row}>
            <View style={iconWrap}>
              <Ionicons name="phone-portrait-outline" size={18} color="#6B7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rowLabel}>Phone Number</Text>
              <Text style={rowValue}>{user?.phone ?? profile?.phone ?? "—"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </View>
        </View>

        {/* PREFERENCES */}
        <Text style={[sectionLabel, { marginTop: 28 }]}>PREFERENCES</Text>
        <View style={card}>
          <Pressable onPress={() => setStylePickerOpen(true)} style={row}>
            <View style={[iconWrap, { backgroundColor: "rgba(123,92,250,0.12)" }]}>
              <Ionicons name="sparkles-outline" size={18} color="#7B5CFA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rowLabel}>AI Summary Style</Text>
              <Text style={rowValue}>{currentStyle.label}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#4B5563" />
          </Pressable>
        </View>

        {/* DANGER ZONE */}
        <Text style={[sectionLabel, { marginTop: 28, color: "#EF4444" }]}>DANGER ZONE</Text>
        <View style={card}>
          <Pressable onPress={handleLogout} style={row}>
            <View style={[iconWrap, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </View>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 15, color: "#EF4444", flex: 1 }}>
              Log out
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Style picker bottom sheet */}
      <Modal visible={stylePickerOpen} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setStylePickerOpen(false)}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: "#1A1D27",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 8,
          }}>
            {/* Drag handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#2A2D3A", alignSelf: "center", marginTop: 12, marginBottom: 20 }} />

            <Text style={{ fontFamily: "Syne_700Bold", fontSize: 18, color: "#F0F2FF", paddingHorizontal: 24, marginBottom: 8 }}>
              AI Summary Style
            </Text>

            {STYLES.map((s, i) => (
              <View key={s.key}>
                {i > 0 && <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginLeft: 24 }} />}
                <Pressable
                  onPress={() => selectStyle(s.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 24,
                    paddingVertical: 18,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 16, color: "#F0F2FF" }}>{s.label}</Text>
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#6B7280", marginTop: 3 }}>{s.desc}</Text>
                  </View>
                  <Ionicons
                    name={profile?.summary_style === s.key ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={profile?.summary_style === s.key ? "#7B5CFA" : "#2A2D3A"}
                  />
                </Pressable>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const sectionLabel: object = {
  fontFamily: "DMSans_500Medium",
  fontSize: 11,
  color: "#6B7280",
  letterSpacing: 1.2,
  paddingHorizontal: 20,
  marginBottom: 8,
};

const card: object = {
  marginHorizontal: 16,
  backgroundColor: "#1A1D27",
  borderRadius: 16,
  overflow: "hidden",
};

const row: object = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 14,
  gap: 12,
};

const iconWrap: object = {
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: "#232638",
  alignItems: "center",
  justifyContent: "center",
};

const divider: object = {
  height: 1,
  backgroundColor: "rgba(255,255,255,0.05)",
  marginLeft: 64,
};

const rowLabel: object = {
  fontFamily: "DMSans_400Regular",
  fontSize: 12,
  color: "#6B7280",
  marginBottom: 2,
};

const rowValue: object = {
  fontFamily: "DMSans_400Regular",
  fontSize: 15,
  color: "#F0F2FF",
};
