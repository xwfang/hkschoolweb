import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Listen on all local IPs
    port: 5173,
    proxy: {
      "/api": {
        // target: "http://47.86.99.208:8080", // Remote backend address
        target: "http://localhost:8080", // Local backend address
        changeOrigin: true,
      },
    },
  },
})
