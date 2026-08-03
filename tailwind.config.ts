import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "640px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "drop-in": {
          from: { opacity: "0", transform: "translateY(-10px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "drop-out": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to: { opacity: "0", transform: "translateY(-10px) scale(0.98)" },
        },
        "grow-in": {
          from: { opacity: "0", transform: "scale(0.93)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pop-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.92)" },
        },
        // 思考中インジケーターの3点(遅延をずらして波打たせる)
        "thinking-dot": {
          "0%, 60%, 100%": { opacity: "0.28", transform: "translateY(0) scale(0.85)" },
          "30%": { opacity: "1", transform: "translateY(-4px) scale(1)" },
        },
        // ONB5問目のペースアイコン(選択中だけ動く)
        // 歩く人: 手足の振り(delayを-0.4sずらすと逆位相になる)+全体の上下ボブ
        "pace-swing-leg": {
          "0%, 100%": { transform: "rotate(12deg)" },
          "50%": { transform: "rotate(-12deg)" },
        },
        "pace-swing-arm": {
          "0%, 100%": { transform: "rotate(10deg)" },
          "50%": { transform: "rotate(-10deg)" },
        },
        "pace-bob": {
          "0%, 100%": { transform: "translateY(0.5px)" },
          "50%": { transform: "translateY(-0.6px)" },
        },
        // 原付: エンジンの振動でカタカタ揺れる
        "pace-putter": {
          "0%, 100%": { transform: "translateY(0.5px) rotate(0.7deg)" },
          "50%": { transform: "translateY(-0.7px) rotate(-0.7deg)" },
        },
        // スーパーカー: 車体の細かい震え+流れるスピード線
        "pace-dash": {
          "0%, 100%": { transform: "translateX(0.6px)" },
          "50%": { transform: "translateX(-0.6px)" },
        },
        "pace-speed-line": {
          "0%": { transform: "translateX(3px)", opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { transform: "translateX(-4px)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pop-in": "pop-in 0.18s cubic-bezier(0.32, 0.72, 0, 1)",
        "pop-out": "pop-out 0.15s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "drop-in": "drop-in 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "drop-out": "drop-out 0.2s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "grow-in": "grow-in 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        "thinking-dot":
          "thinking-dot 1.3s cubic-bezier(0.32, 0.72, 0, 1) infinite",
        "pace-swing-leg": "pace-swing-leg 0.8s ease-in-out infinite",
        "pace-swing-arm": "pace-swing-arm 0.8s ease-in-out infinite",
        "pace-bob": "pace-bob 0.4s ease-in-out infinite",
        "pace-putter": "pace-putter 0.32s ease-in-out infinite",
        "pace-dash": "pace-dash 0.18s ease-in-out infinite",
        "pace-speed-line": "pace-speed-line 0.7s linear infinite",
      },
      transitionTimingFunction: {
        ios: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
