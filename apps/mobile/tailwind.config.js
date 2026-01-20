/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1990e6",
        "primary-dark": "#006bbd",
        accent: "#FFD700",
        background: {
          light: "#ffffff",
          dark: "#171f26",
        },
        card: {
          light: "#F5F7FA",
          dark: "#232d36",
        },
        text: {
          light: "#0e151b",
          dark: "#ffffff",
        }
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        medium: ["PlusJakartaSans_500Medium"],
        semibold: ["PlusJakartaSans_600SemiBold"],
        bold: ["PlusJakartaSans_700Bold"],
      },
    },
  },
  plugins: [],
}
