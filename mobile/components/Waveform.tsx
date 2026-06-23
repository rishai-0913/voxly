import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

const BAR_COUNT = 32;

export default function Waveform({ active }: { active: boolean }) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => Animated.timing(a, { toValue: 0.2, duration: 300, useNativeDriver: true }).start());
      return;
    }

    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 250 + Math.random() * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.4,
            duration: 250 + Math.random() * 300,
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active]);

  return (
    <View className="flex-row items-center justify-center gap-0.5 h-24 px-4">
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 80,
            borderRadius: 2,
            backgroundColor: i % 3 === 0 ? "#7B5CFA" : i % 3 === 1 ? "#9B7CFF" : "#A78BFA",
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
}
