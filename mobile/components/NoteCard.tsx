import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Note } from "../types";
import { useTheme } from "../contexts/theme";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

interface Props {
  note: Note;
}

export default function NoteCard({ note }: Props) {
  const { dark } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/note/${note._id}`)}
      className="mx-4 mb-3 rounded-card p-4"
      style={{
        backgroundColor: dark ? "#151820" : "#FFFFFF",
        borderWidth: 1,
        borderColor: dark ? "#1E2130" : "#E8E6F8",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: dark ? 0 : 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Title row */}
      <View className="flex-row items-start justify-between mb-1">
        <Text
          className="text-base font-syne-bold flex-1 mr-2"
          style={{ color: dark ? "#F0F2FF" : "#0C0E14" }}
          numberOfLines={1}
        >
          {note.title}
        </Text>
        <Text
          className="text-xs font-space-mono"
          style={{ color: "#6B7280" }}
        >
          {formatDuration(note.duration_seconds)}
        </Text>
      </View>

      {/* Timestamp */}
      <Text className="text-xs mb-2 font-space-mono" style={{ color: "#6B7280" }}>
        {formatRelative(note.created_at)}
      </Text>

      {/* Summary preview */}
      <Text
        className="text-sm mb-3 leading-5"
        style={{ color: dark ? "#9CA3AF" : "#374151" }}
        numberOfLines={2}
      >
        {note.summary}
      </Text>

      {/* Stats */}
      {(note.action_items?.length > 0 || note.key_points?.length > 0) && (
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 10 }}>
          {note.key_points?.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="bulb-outline" size={13} color="#A78BFA" />
              <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "SpaceMono_400Regular" }}>
                {note.key_points.length} Points
              </Text>
            </View>
          )}
          {note.action_items?.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="checkmark-done-outline" size={13} color="#A78BFA" />
              <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "SpaceMono_400Regular" }}>
                {note.action_items.length} Items
              </Text>
            </View>
          )}
        </View>
      )}

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
    </Pressable>
  );
}
