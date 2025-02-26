import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)), // Alias for src folder
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/main.js"),
      },
      output: {
        entryFileNames: "web-widget.js", // Output file name
        format: "iife", // Immediately Invoked Function Expression
      },
    },
  },
});
