import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0f",
        bench: "#5b5bd6",
      },
    },
  },
  plugins: [],
} satisfies Config;
