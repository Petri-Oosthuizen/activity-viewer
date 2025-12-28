import pluginVue from "eslint-plugin-vue";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/coverage/**",
      "**/tests/**",
      ".gitignore",
      "**/generated/**",
    ],
  },

  ...pluginVue.configs["flat/recommended"],

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: pluginVue.parser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^(props|emit)$", // Vue defineEmits/defineProps patterns
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",

      // Vue component best practices
      "vue/multi-word-component-names": "off", // Nuxt pages use single-word names
      "vue/attributes-order": "off", // Don't enforce attribute order
      "vue/block-order": ["warn", { order: ["template", "script[setup]", "style[scoped]"] }],
      "vue/component-api-style": ["error", ["script-setup", "composition"]],
      "vue/component-name-in-template-casing": "error",
      "vue/no-undef-properties": "warn",
      "vue/no-useless-v-bind": "warn",
      "vue/padding-line-between-blocks": "warn",
      "vue/define-props-declaration": "error",
      "vue/require-macro-variable-name": "error",
      "vue/valid-define-options": "error",
      "vue/no-undef-components": "off", // Nuxt auto-imports components
    },
  },

  skipFormatting,
];
