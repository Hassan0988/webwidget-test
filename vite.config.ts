import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

export default defineConfig({
  server: {
    allowedHosts: [
      "julietta-unjewelled-rosily.ngrok-free.dev",
      "localhost",
      "127.0.0.1",
      "*.netlify.app",
      "devserver-main--resilient-crepe-03f0a4.netlify.app"
    ]
  },
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
        entryFileNames: "web-widget-staging.js", // Output file name
        format: "iife", // Immediately Invoked Function Expression
      },
    },
  },
});
