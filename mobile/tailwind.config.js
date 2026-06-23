/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#7B5CFA",
        "primary-dim": "rgba(123,92,250,0.15)",
        secondary: "#A78BFA",
        success: "#34D399",
        "success-light": "#059669",
        // dark surfaces
        "bg-dark": "#0C0E14",
        "surface-dark": "#151820",
        "border-dark": "#1E2130",
        "text-dark": "#F0F2FF",
        // light surfaces
        "bg-light": "#F5F4FF",
        "surface-light": "#FFFFFF",
        "border-light": "#E8E6F8",
        "text-light": "#0C0E14",
        // shared muted
        muted: "#6B7280",
      },
      fontFamily: {
        syne: ["Syne_700Bold"],
        "syne-bold": ["Syne_700Bold"],
        "dm-sans": ["DMSans_400Regular"],
        "dm-sans-medium": ["DMSans_500Medium"],
        "space-mono": ["SpaceMono_400Regular"],
      },
      borderRadius: {
        pill: "9999px",
        card: "12px",
        btn: "10px",
        chip: "20px",
      },
    },
  },
  plugins: [],
};
