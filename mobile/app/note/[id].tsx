import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Clipboard,
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import StructuredOutput from "../../components/StructuredOutput";
import { getNote, updateNote, deleteNote } from "../../services/api";
import { Note } from "../../types";
import { useTheme } from "../../contexts/theme";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dark } = useTheme();
  const insets = useSafeAreaInsets();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Checked action items — lifted from StructuredOutput so we can track & save
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const savedItemsRef = useRef<number[]>([]);

  const toastY = useRef(new Animated.Value(-80)).current;

  const bg = dark ? "#0C0E14" : "#F5F4FF";
  const surface = dark ? "#151820" : "#FFFFFF";
  const border = dark ? "#1E2130" : "#E8E6F8";
  const textPrimary = dark ? "#F0F2FF" : "#0C0E14";

  useEffect(() => {
    toastY.setValue(-80);
    if (!id) return;
    setLoading(true);
    getNote(id)
      .then((n) => {
        setNote(n);
        const initial = n.completed_items ?? [];
        setCompletedItems(initial);
        savedItemsRef.current = initial;
      })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  // True when checked state differs from what's persisted
  const hasChanges =
    JSON.stringify([...completedItems].sort((a, b) => a - b)) !==
    JSON.stringify([...savedItemsRef.current].sort((a, b) => a - b));

  const handleToggle = useCallback((i: number) => {
    setCompletedItems((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }, []);

  // ── Toast helpers ──────────────────────────────────────────
  const showToast = (message: string) =>
    new Promise<void>((resolve) => {
      Animated.sequence([
        Animated.spring(toastY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
        Animated.delay(1200),
        Animated.timing(toastY, { toValue: -80, duration: 250, useNativeDriver: true }),
      ]).start(() => resolve());
    });

  // ── Save ───────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState("Changes saved");

  const doSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateNote(id, { completed_items: completedItems });
      savedItemsRef.current = [...completedItems];
    } finally {
      setSaving(false);
    }
  }, [id, completedItems]);

  const handleSave = useCallback(async () => {
    await doSave();
    setToastMessage("Changes saved");
    await showToast("Changes saved");
    router.replace("/home");
  }, [doSave]);

  // ── Back navigation with unsaved-changes guard ─────────────
  const handleBack = useCallback(() => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert(
      "Unsaved changes",
      "You have unsaved changes to your action items.",
      [
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back(),
        },
        {
          text: "Save",
          style: "default",
          onPress: handleSave,
        },
      ]
    );
  }, [hasChanges, handleSave]);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (hasChanges) {
        handleBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasChanges, handleBack]);

  // ── Share / Copy ───────────────────────────────────────────
  const copyAll = () => {
    if (!note) return;
    const text = [
      `# ${note.title}`,
      `\n## Summary\n${note.summary}`,
      `\n## Key Points\n${note.key_points.map((p) => `• ${p}`).join("\n")}`,
      `\n## Action Items\n${note.action_items.map((a, i) => `${completedItems.includes(i) ? "✓" : "☐"} ${a}`).join("\n")}`,
    ].join("\n");
    Clipboard.setString(text);
  };

  const shareNote = async () => {
    if (!note) return;
    await Share.share({
      title: note.title,
      message: `${note.title}\n\n${note.summary}\n\nKey Points:\n${note.key_points.map((p) => `• ${p}`).join("\n")}`,
    });
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert("Delete note", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          setDeleting(true);
          try {
            await deleteNote(id);
            setToastMessage("Note deleted successfully");
            await showToast("Note deleted successfully");
            router.replace("/home");
          } catch {
            setDeleting(false);
            Alert.alert("Error", "Could not delete note. Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
        <ActivityIndicator size="large" color="#7B5CFA" />
      </View>
    );
  }

  if (!note) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: bg, opacity: deleting || saving ? 0.7 : 1 }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="px-4 pb-3 flex-row items-center gap-3"
      >
        <Pressable onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={textPrimary} />
        </Pressable>
        <Text
          className="flex-1 text-base font-syne-bold"
          numberOfLines={1}
          style={{ color: textPrimary }}
        >
          {note.title}
        </Text>
        <Pressable onPress={shareNote} className="mr-2">
          <Ionicons name="share-outline" size={22} color="#7B5CFA" />
        </Pressable>
        <Pressable onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Metadata */}
        <View className="px-4 mb-3">
          <Text
            className="text-xs mb-3"
            style={{ color: "#6B7280", fontFamily: "SpaceMono_400Regular" }}
          >
            {formatDate(note.created_at)} · {formatDuration(note.duration_seconds)}
            {note.word_count ? ` · ${note.word_count} words` : ""}
          </Text>

          {/* Tags */}
          {note.tags?.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <View
                  key={tag}
                  className="rounded-pill px-2.5 py-1"
                  style={{ backgroundColor: "rgba(123,92,250,0.12)" }}
                >
                  <Text
                    className="text-xs font-dm-sans-medium"
                    style={{ color: dark ? "#A78BFA" : "#7B5CFA" }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* AI structured output */}
        <StructuredOutput
          summary={note.summary}
          keyPoints={note.key_points ?? []}
          actionItems={note.action_items ?? []}
          completedItems={completedItems}
          onToggle={handleToggle}
          dark={dark}
        />

        {/* Transcript (collapsible) */}
        <Pressable
          onPress={() => setTranscriptOpen((o) => !o)}
          className="mx-4 mb-3 rounded-card p-4 flex-row items-center justify-between"
          style={{
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="document-text-outline" size={14} color="#7B5CFA" />
            <Text
              className="text-xs font-dm-sans-medium tracking-widest uppercase"
              style={{ color: "#7B5CFA" }}
            >
              Transcript
            </Text>
          </View>
          <Ionicons
            name={transcriptOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color="#6B7280"
          />
        </Pressable>

        {transcriptOpen && note.transcript && (
          <View
            className="mx-4 mb-3 rounded-card p-4"
            style={{ backgroundColor: surface, borderWidth: 1, borderColor: border }}
          >
            <Text className="text-sm leading-6" style={{ color: dark ? "#9CA3AF" : "#374151" }}>
              {note.transcript}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Toast — slides down from top */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          transform: [{ translateY: toastY }],
          backgroundColor: "#16A34A",
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 8,
          zIndex: 100,
        }}
      >
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "DMSans_500Medium" }}>
          {toastMessage}
        </Text>
      </Animated.View>

      {/* Bottom action bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 12,
          paddingTop: 12,
          paddingHorizontal: 16,
          backgroundColor: dark ? "#0C0E14" : "#F5F4FF",
          borderTopWidth: 1,
          borderTopColor: border,
          flexDirection: "row",
          gap: 12,
        }}
      >
        {/* Save button — lights up when there are unsaved changes */}
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges || saving}
          className="flex-1 rounded-btn items-center justify-center"
          style={{
            height: 48,
            backgroundColor: hasChanges ? "#7B5CFA" : (dark ? "#1E2130" : "#E8E6F8"),
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={hasChanges ? "#FFFFFF" : "#6B7280"} />
          ) : (
            <Text
              className="text-sm font-dm-sans-medium"
              style={{ color: hasChanges ? "#FFFFFF" : "#6B7280" }}
            >
              Save
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={shareNote}
          className="flex-1 rounded-btn items-center justify-center"
          style={{ height: 48, backgroundColor: "#7B5CFA" }}
        >
          <Text className="text-sm font-dm-sans-medium" style={{ color: "#FFFFFF" }}>
            Share
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
