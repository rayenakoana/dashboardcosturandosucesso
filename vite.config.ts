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
    proxy: env.N8N_ADMIN_SECRET
      ? {
          "/api/admin/criar-usuario": {
            target: env.N8N_ADMIN_CRIAR_USUARIO_URL,
            changeOrigin: true,
            rewrite: () => "",
            configure: (proxy) => {
              proxy.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader("X-Admin-Secret", env.N8N_ADMIN_SECRET);
              });
            },
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
