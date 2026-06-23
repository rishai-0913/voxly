import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useState, useRef, useEffect, Fragment } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import Waveform from "../components/Waveform";
import { uploadAudio } from "../services/api";
import { ProcessingStep } from "../types";
import { useTheme } from "../contexts/theme";

const MAX_DURATION = 300; // 5 minutes

const STEPS: { key: ProcessingStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "recording",   label: "Record",    icon: "mic"      },
  { key: "transcribing", label: "Transcribe", icon: "text"    },
  { key: "summarising",  label: "Summarise",  icon: "sparkles" },
];

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RecordScreen() {
  const { dark } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep]       = useState<ProcessingStep>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recordingRef  = useRef<Audio.Recording | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing ring animation for the stop button
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  // Button press scale spring
  const btnScale = useRef(new Animated.Value(1)).current;

  const bg         = dark ? "#0C0E14" : "#F5F4FF";
  const textPrimary = dark ? "#F0F2FF" : "#0C0E14";

  // Pre-initialise audio mode on mount so the button tap has no setup lag
  useEffect(() => {
    const init = async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    };
    init();
    return () => stopTimer();
  }, []);

  // Pulsing ring runs while recording
  const isRecording  = step === "recording";
  const isProcessing = step === "transcribing" || step === "summarising";

  useEffect(() => {
    if (!isRecording) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0);
      return;
    }
    // Set start values so Animated.loop resets to these each iteration
    pulseScale.setValue(1);
    pulseOpacity.setValue(0.4);
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale,   { toValue: 1.65, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0,    duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording]);

  const onPressIn = () =>
    Animated.spring(btnScale, { toValue: 0.87, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  const onPressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= MAX_DURATION) { stopRecording(); return MAX_DURATION; }
        return e + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRecording = async () => {
    // Give immediate visual + waveform feedback before async setup
    setStep("recording");
    setElapsed(0);
    startTimer();
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
    } catch {
      stopTimer();
      setStep("idle");
      setElapsed(0);
      Alert.alert("Error", "Could not start recording. Check microphone permissions.");
    }
  };

  const stopRecording = async () => {
    stopTimer();
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;

      setStep("transcribing");
      await new Promise((r) => setTimeout(r, 800));
      setStep("summarising");

      const note = await uploadAudio(uri, "audio/m4a");

      setStep("done");
      await new Promise((r) => setTimeout(r, 400));
      router.replace(`/note/${note._id}`);
    } catch {
      Alert.alert("Error", "Failed to process recording. Please try again.");
      setStep("idle");
    }
  };

  const handleButton = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === "idle") startRecording();
    else if (step === "recording") stopRecording();
  };

  const stepIndex = STEPS.findIndex((x) => x.key === step);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3 flex-row items-center">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </Pressable>
        <Text className="text-base font-syne-bold" style={{ color: textPrimary }}>
          New Note
        </Text>
      </View>

      {/* Main content */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        {step === "idle" ? (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 96, height: 96, borderRadius: 48,
                backgroundColor: dark ? "#151820" : "#FFFFFF",
                alignItems: "center", justifyContent: "center",
                marginBottom: 24,
                shadowColor: "#7B5CFA",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
              }}
            >
              <Ionicons name="mic-outline" size={40} color="#7B5CFA" />
            </View>
            <Text className="text-base font-syne-bold mb-2" style={{ color: textPrimary }}>
              Ready to record
            </Text>
            <Text className="text-sm text-center" style={{ color: "#6B7280" }}>
              Tap the button below to start capturing your voice note
            </Text>
          </View>
        ) : (
          <>
            <Waveform active={isRecording} />

            {/* Timer */}
            <Text
              style={{ fontSize: 56, color: textPrimary, fontFamily: "SpaceMono_400Regular", letterSpacing: -2, marginTop: 24, marginBottom: 4 }}
            >
              {formatTime(elapsed)}
            </Text>
            <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "SpaceMono_400Regular", letterSpacing: 2, textTransform: "uppercase" }}>
              Max {formatTime(MAX_DURATION)}
            </Text>

            {/* Step indicators with connecting lines */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 40, width: "100%", maxWidth: 300 }}>
              {STEPS.map((s, i) => {
                const isActive = s.key === step;
                const isDone   = stepIndex > i;
                return (
                  <Fragment key={s.key}>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <View
                        style={{
                          width: 44, height: 44, borderRadius: 22,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: isActive || isDone ? "#7B5CFA" : dark ? "#1E2130" : "#E8E6F8",
                          borderWidth: isActive ? 0 : 1,
                          borderColor: dark ? "#1E2130" : "#E8E6F8",
                          shadowColor: isActive ? "#7B5CFA" : "transparent",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 12,
                        }}
                      >
                        {isDone ? (
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        ) : isActive && isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons
                            name={s.icon}
                            size={18}
                            color={isActive ? "#FFFFFF" : "#6B7280"}
                          />
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "SpaceMono_400Regular",
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          color: isActive || isDone ? "#7B5CFA" : "#6B7280",
                        }}
                      >
                        {s.label}
                      </Text>
                    </View>

                    {/* Connecting line between steps */}
                    {i < STEPS.length - 1 && (
                      <View
                        style={{
                          flex: 1, height: 1,
                          backgroundColor: stepIndex > i ? "#7B5CFA" : "#6B7280",
                          opacity: stepIndex > i ? 0.5 : 0.2,
                          marginTop: 22,
                        }}
                      />
                    )}
                  </Fragment>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Control button with pulsing ring */}
      <View style={{ paddingBottom: insets.bottom + 48, alignItems: "center", gap: 12 }}>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          {/* Pulsing ring — always rendered, opacity driven by animation */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: "#7B5CFA",
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            }}
          />
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={handleButton}
              disabled={isProcessing}
              android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true, radius: 36 }}
              style={{
                width: 72, height: 72, borderRadius: 36,
                alignItems: "center", justifyContent: "center",
                opacity: isProcessing ? 0.5 : 1,
                backgroundColor: isRecording ? "transparent" : "#7B5CFA",
                borderWidth: isRecording ? 2.5 : 0,
                borderColor: "#7B5CFA",
                shadowColor: "#7B5CFA",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isRecording ? 0 : 0.45,
                shadowRadius: 16,
                elevation: isRecording ? 0 : 8,
              }}
            >
              {isRecording ? (
                <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
              ) : (
                <Ionicons name="mic" size={28} color="#FFFFFF" />
              )}
            </Pressable>
          </Animated.View>
        </View>
        <Text style={{ fontSize: 11, color: "#6B7280", fontFamily: "SpaceMono_400Regular", letterSpacing: 2, textTransform: "uppercase" }}>
          {step === "idle" ? "Tap to start" : isRecording ? "Tap to stop" : "Processing…"}
        </Text>
      </View>
    </View>
  );
}
