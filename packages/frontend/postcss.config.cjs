const tailwindcss = require("tailwindcss");
const tailwindcssNesting = require("tailwindcss/nesting");
const autoprefixer = require("autoprefixer");

const config = {
  plugins: [
    // some plugins, like tailwindcss/nesting, need to run before tailwind:
    tailwindcssNesting(),
    tailwindcss(),
    // but others, like autoprefixer, need to run after
    autoprefixer,
  ],
};

module.exports = config;
