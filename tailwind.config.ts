import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0f",
        bench: "#5b5bd6",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out-up": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(-6px)" },
        },
        "check-pop": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "60%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "check-draw": {
          from: { strokeDashoffset: "24" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 280ms ease-out both",
        "fade-out-up": "fade-out-up 320ms ease-in both",
        "check-pop": "check-pop 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "check-draw": "check-draw 360ms ease-out 120ms both",
      },
    },
  },
  plugins: [],
} satisfies Config;
