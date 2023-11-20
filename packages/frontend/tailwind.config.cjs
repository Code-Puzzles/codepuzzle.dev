/** @type {import('tailwindcss').Config}*/
const config = {
  content: [
    "src/**/*.{html,js,svelte,ts}",
    "node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
  ],

  plugins: [require("flowbite/plugin")],

  // FIXME: for some reason tailwind doesn't correctly infer all classes from flowbite-svelte
  // as a workaround this list manually includes them
  safelist: [
    "bg-gray-900",
    "bg-opacity-50",
    "bg-white",
    "border-gray-200",
    "border",
    "dark:bg-opacity-80",
    "dark:bg-transparent",
    "dark:border-gray-600",
    "dark:focus-within:ring-gray-700",
    "dark:focus-within:text-white",
    "dark:hover:border-gray-700",
    "dark:hover:text-white",
    "dark:text-gray-400",
    "fixed",
    "focus-within:outline-none",
    "focus-within:ring-4",
    "focus-within:ring-gray-200",
    "focus-within:text-primary-700",
    "font-medium",
    "hover:bg-gray-100",
    "hover:text-primary-700",
    "inline-flex",
    "inset-0",
    "items-center",
    "justify-center",
    "opacity-50",
    "px-5",
    "py-2.5",
    "rounded-lg",
    "text-center",
    "text-gray-900",
    "text-sm",
    "z-40",
  ],

  darkMode: "class",

  theme: {
    extend: {
      colors: {
        // flowbite-svelte
        primary: {
          50: "#FFF5F2",
          100: "#FFF1EE",
          200: "#FFE4DE",
          300: "#FFD5CC",
          400: "#FFBCAD",
          500: "#FE795D",
          600: "#EF562F",
          700: "#EB4F27",
          800: "#CC4522",
          900: "#A5371B",
        },
      },
    },
  },
};

module.exports = config;
