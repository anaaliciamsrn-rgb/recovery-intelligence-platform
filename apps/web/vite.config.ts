import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Separa libs pesadas e raramente mudadas do bundle da aplicação —
        // melhora o cache do navegador entre deploys (o vendor chunk só
        // invalida quando uma dependência muda, não a cada release).
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
});
