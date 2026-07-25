import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // agar bisa diakses dari HP di jaringan Wi-Fi yang sama saat testing
    port: 5174, // beda dari v1 (5173) supaya kedua game bisa jalan berdampingan
  },
})
