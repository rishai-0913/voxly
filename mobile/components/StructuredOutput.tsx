import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  dark: boolean;
  accentColor?: string;
}

function SectionCard({ title, icon, children, dark, accentColor = "#7B5CFA" }: SectionCardProps) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 20,
        backgroundColor: dark ? "#151820" : "#FFFFFF",
        borderWidth: 1,
        borderColor: dark ? "#1E2130" : "#E8E6F8",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <View
          style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: accentColor + "20",
            alignItems: "center", justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_500Medium",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: accentColor,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

interface Props {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  completedItems: number[];
  onToggle: (i: number) => void;
  dark: boolean;
}

export default function StructuredOutput({ summary, keyPoints, actionItems, completedItems, onToggle, dark }: Props) {
  const bodyColor   = dark ? "#9CA3AF" : "#374151";
  const primaryText = dark ? "#F0F2FF" : "#0C0E14";

  return (
    <>
      {/* Summary */}
      <SectionCard
        title="Summary"
        icon={<Ionicons name="sparkles" size={16} color="#7B5CFA" />}
        dark={dark}
      >
        <Text style={{ fontSize: 15, lineHeight: 24, color: primaryText }}>
          {summary}
        </Text>
      </SectionCard>

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <SectionCard
          title="Key Points"
          icon={<Ionicons name="list" size={16} color="#7B5CFA" />}
          dark={dark}
        >
          {keyPoints.map((point, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: i < keyPoints.length - 1 ? 12 : 0 }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#7B5CFA", marginTop: 9, marginRight: 12 }} />
              <Text style={{ fontSize: 15, lineHeight: 24, flex: 1, color: bodyColor }}>
                {point}
              </Text>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Action Items — tappable checkboxes with strikethrough */}
      {actionItems.length > 0 && (
        <SectionCard
          title="Action Items"
          icon={<Ionicons name="checkbox-outline" size={16} color="#34D399" />}
          dark={dark}
          accentColor="#34D399"
        >
          {actionItems.map((item, i) => {
            const done = completedItems.includes(i);
            return (
              <Pressable
                key={i}
                onPress={() => onToggle(i)}
                style={({ pressed }) => ({
                  marginBottom: i < actionItems.length - 1 ? 14 : 0,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Ionicons
                    name={done ? "checkbox" : "square-outline"}
                    size={20}
                    color={done ? "#34D399" : "#6B7280"}
                    style={{ marginTop: 2, marginRight: 12 }}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 24,
                      flex: 1,
                      color: done ? "#6B7280" : bodyColor,
                      textDecorationLine: done ? "line-through" : "none",
                    }}
                  >
                    {item}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </SectionCard>
      )}
    </>
  );
}
