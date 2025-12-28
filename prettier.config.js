/** @type {import("prettier").Config} */
export default {
  semi: true,
  tabWidth: 2,
  singleQuote: false,
  printWidth: 100,
  trailingComma: "all",
  useTabs: false,
  plugins: ["prettier-plugin-tailwindcss"],
  overrides: [
    {
      files: "**/i18n/**.json",
      options: {
        plugins: ["prettier-plugin-sort-json"],
        jsonRecursiveSort: true,
      },
    },
  ],
};



