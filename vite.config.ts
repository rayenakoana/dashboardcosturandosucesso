import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: env.SUPABASE_FUNCTIONS_URL
      ? {
          "/api/claude": {
            target: `${env.SUPABASE_FUNCTIONS_URL}/claude-proxy`,
            changeOrigin: true,
            rewrite: () => "",
          },
          "/api/admin/criar-usuario": {
            target: `${env.SUPABASE_FUNCTIONS_URL}/admin-criar-usuario`,
            changeOrigin: true,
            rewrite: () => "",
          },
        }
      : {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  };
});
