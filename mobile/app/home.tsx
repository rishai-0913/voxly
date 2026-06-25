import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import NoteCard from "../components/NoteCard";
import Logo from "../components/Logo";
import { getNotes, uploadAudio } from "../services/api";
import { Note } from "../types";
import { useTheme, ThemeMode } from "../contexts/theme";

const THEME_OPTS: {
  mode: ThemeMode;
  offIcon: keyof typeof Ionicons.glyphMap;
  onIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { mode: "dark",  offIcon: "moon-outline",  onIcon: "moon"  },
  { mode: "light", offIcon: "sunny-outline", onIcon: "sunny" },
];

export default function HomeScreen() {
  const { dark, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [notes, setNotes] = useState<Note[]>([]);
  const [filtered, setFiltered] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const hasLoadedRef = useRef(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  const onFabPressIn = () =>
    Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onFabPressOut = () =>
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  const bg      = dark ? "#0C0E14" : "#F5F4FF";
  const surface = dark ? "#151820" : "#FFFFFF";
  const border  = dark ? "#1E2130" : "#E8E6F8";
  const textPrimary = dark ? "#F0F2FF" : "#0C0E14";
  const chipBg  = dark ? "#1E2130" : "#E8E6F8";

  // Derive unique tags from loaded notes; capitalize for display
  const filters = useMemo(() => {
    const seen = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => seen.add(t.toLowerCase())));
    const sorted = Array.from(seen).sort();
    return ["All", ...sorted];
  }, [notes]);

  // If the active filter no longer exists (e.g. after all notes with that tag are deleted), reset to All
  useEffect(() => {
    if (activeFilter !== "All" && !filters.includes(activeFilter)) {
      setActiveFilter("All");
      applyFilters(notes, query, "All");
    }
  }, [filters]);

  const applyFilters = useCallback(
    (data: Note[], q: string, f: string) => {
      let result = data;
      if (q.trim()) {
        const lq = q.toLowerCase();
        result = result.filter(
          (n) =>
            n.title.toLowerCase().includes(lq) ||
            n.summary?.toLowerCase().includes(lq) ||
            n.tags?.some((t) => t.toLowerCase().includes(lq))
        );
      }
      if (f !== "All") {
        const lf = f.toLowerCase();
        result = result.filter((n) => n.tags?.some((t) => t.toLowerCase() === lf));
      }
      setFiltered(result);
    },
    []
  );

  const fetchNotes = useCallback(async () => {
    // Only show full-screen spinner on the very first load
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const data = await getNotes();
      setNotes(data);
      applyFilters(data, query, activeFilter);
      hasLoadedRef.current = true;
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getNotes();
      setNotes(data);
      applyFilters(data, query, activeFilter);
    } catch {}
    finally {
      setRefreshing(false);
    }
  }, [query, activeFilter]);

  // Re-fetch every time this screen comes into focus (handles back-from-record)
  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  const handleQueryChange = (q: string) => {
    setQuery(q);
    applyFilters(notes, q, activeFilter);
  };

  const handleFilterChange = (f: string) => {
    setActiveFilter(f);
    applyFilters(notes, query, f);
  };

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/m4a", "audio/wav", "audio/*"],
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const note = await uploadAudio(file.uri, file.mimeType ?? "audio/m4a");
      setNotes((prev) => [note, ...prev]);
      applyFilters([note, ...notes], query, activeFilter);
    } finally {
      setUploading(false);
    }
  };

  // Bottom nav + FAB heights
  const NAV_HEIGHT = 56;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}
        className="px-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Logo size={0.55} />
          <Text className="text-2xl font-syne-bold" style={{ color: textPrimary }}>
            Voxly
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 6 }}>
          {THEME_OPTS.map(({ mode: m, offIcon, onIcon }) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  backgroundColor: active ? "#7B5CFA" : chipBg,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons
                  name={active ? onIcon : offIcon}
                  size={15}
                  color={active ? "#FFFFFF" : "#6B7280"}
                />
              </Pressable>
            );
          })}

          <View style={{ width: 1, height: 16, backgroundColor: border, marginHorizontal: 2 }} />

          <Pressable onPress={handleUpload} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#7B5CFA" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color="#7B5CFA" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View
        className="mx-4 mt-3 mb-2 flex-row items-center rounded-2xl px-3"
        style={{ backgroundColor: surface, borderWidth: 1, borderColor: border, height: 48 }}
      >
        <Ionicons name="search-outline" size={16} color="#6B7280" />
        <TextInput
          className="flex-1 ml-2 text-sm font-dm-sans"
          placeholder="Search notes…"
          placeholderTextColor="#6B7280"
          value={query}
          onChangeText={handleQueryChange}
          style={{ color: textPrimary }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => handleQueryChange("")}>
            <Ionicons name="close-circle" size={16} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => handleFilterChange(f)}
            style={{
              height: 32, paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: activeFilter === f ? "#7B5CFA" : chipBg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text
              className="text-xs font-dm-sans-medium"
              style={{ color: activeFilter === f ? "#FFFFFF" : "#6B7280" }}
            >
              {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Notes list — always rendered so pull-to-refresh works on all states */}
      <FlatList
        data={filtered}
        keyExtractor={(n) => n._id}
        renderItem={({ item }) => <NoteCard note={item} />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + NAV_HEIGHT + 80, flexGrow: 1, justifyContent: "flex-start" }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <ActivityIndicator size="large" color="#7B5CFA" />
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 32 }}>
              <Ionicons name="mic-outline" size={48} color={dark ? "#1E2130" : "#D1C4FF"} />
              <Text className="text-base font-syne-bold mt-4 text-center" style={{ color: textPrimary }}>
                {query ? "No notes match your search" : "No notes yet"}
              </Text>
              <Text className="text-sm mt-2 text-center" style={{ color: "#6B7280" }}>
                Tap the mic button to capture your first voice note
              </Text>
            </View>
          )
        }
      />

      {/* FAB Record Button — sits above the nav bar */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + NAV_HEIGHT + 16,
          alignSelf: "center",
        }}
      >
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <Pressable
            onPressIn={onFabPressIn}
            onPressOut={onFabPressOut}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/record");
            }}
            android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: true, radius: 36 }}
            style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: "#7B5CFA",
              alignItems: "center", justifyContent: "center",
              shadowColor: "#7B5CFA",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Ionicons name="mic" size={28} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </View>

      {/* Bottom Nav Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 12,
          paddingBottom: insets.bottom + 8,
          backgroundColor: dark ? "rgba(21,24,32,0.97)" : "rgba(255,255,255,0.97)",
          borderTopWidth: 1,
          borderTopColor: dark ? "rgba(107,114,128,0.1)" : "#E8E6F8",
        }}
      >
        {/* Recents (active) */}
        <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
          <View style={{
            width: 48, height: 32, borderRadius: 16,
            backgroundColor: "rgba(123,92,250,0.15)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="time" size={20} color="#7B5CFA" />
          </View>
          <Text style={{ fontSize: 11, color: "#7B5CFA", fontFamily: "DMSans_500Medium" }}>
            Recents
          </Text>
        </View>

        {/* Center spacer for FAB */}
        <View style={{ width: 88 }} />

        {/* Settings */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Pressable
            onPress={() => router.push("/settings")}
            style={{ alignItems: "center", gap: 5 }}
          >
            <View style={{
              width: 48, height: 32, borderRadius: 16,
              backgroundColor: "transparent",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="settings-outline" size={20} color="#6B7280" />
            </View>
            <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "DMSans_500Medium" }}>
              Settings
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
