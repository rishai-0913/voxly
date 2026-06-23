import { Pressable, View, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface Props {
  recording: boolean;
  onPress: () => void;
}

export default function RecordButton({ recording, onPress }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.3, duration: 800, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulse.setValue(1);
      opacity.setValue(0.4);
    }
  }, [recording]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View className="items-center justify-center">
      {/* Pulse ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(123,92,250,0.3)",
          transform: [{ scale: pulse }],
          opacity,
        }}
      />
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: recording ? "#EF4444" : "#7B5CFA",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          shadowColor: recording ? "#EF4444" : "#7B5CFA",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
          elevation: 8,
        })}
      >
        <Ionicons
          name={recording ? "stop" : "mic"}
          size={28}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}
