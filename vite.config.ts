import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // 単一HTML書き出し時(Artifactプレビュー用)はフォント等の全アセットを埋め込む
    assetsInlineLimit: process.env.VITE_SINGLE_FILE ? 100_000_000 : undefined,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
