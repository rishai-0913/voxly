import { View, Animated } from "react-native";
import { useEffect, useRef } from "react";

const BARS = [
  { min: 30, max: 50, dur: 1200, delay: 0 },
  { min: 40, max: 65, dur: 1000, delay: 200 },
  { min: 35, max: 60, dur: 1400, delay: 100 },
  { min: 40, max: 65, dur: 1000, delay: 300 },
  { min: 30, max: 50, dur: 1200, delay: 400 },
];

type Props = { size?: number; animated?: boolean };

export default function Logo({ size = 1, animated = false }: Props) {
  const heights = useRef(BARS.map((b) => new Animated.Value(b.min))).current;
  const glow = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (!animated) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const loops: Animated.CompositeAnimation[] = [];

    BARS.forEach((bar, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(heights[i], {
            toValue: bar.max,
            duration: bar.dur / 2,
            useNativeDriver: false,
          }),
          Animated.timing(heights[i], {
            toValue: bar.min,
            duration: bar.dur / 2,
            useNativeDriver: false,
          }),
        ])
      );
      const id = setTimeout(() => loop.start(), bar.delay);
      timeouts.push(id);
      loops.push(loop);
    });

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 20, duration: 1500, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 6,  duration: 1500, useNativeDriver: false }),
      ])
    );
    glowLoop.start();
    loops.push(glowLoop);

    return () => {
      timeouts.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, [animated]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 6 * size,
        // when animated, bars grow up to max height (65px); at rest, tallest bar is 40px
        height: animated ? 68 * size : 40 * size,
      }}
    >
      {BARS.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8 * size,
            height: animated
              ? heights[i].interpolate({
                  inputRange: [bar.min, bar.max],
                  outputRange: [bar.min * size, bar.max * size],
                })
              : bar.min * size,
            borderRadius: 4 * size,
            backgroundColor: "#7B5CFA",
            shadowColor: "#7B5CFA",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: animated ? glow : 8,
          }}
        />
      ))}
    </View>
  );
}
