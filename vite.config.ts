/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built site works from any address (e.g. GitHub Pages' /mattandkaylalove/).
  base: './',
  // Pre-bundle the 3D book's dependencies at startup. Otherwise the first visit to ?book=3d
  // makes the dev server bundle them and reload every open page mid-session.
  optimizeDeps: {
    include: ['three', '@react-three/fiber', 'three/examples/jsm/environments/RoomEnvironment.js', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/libs/meshopt_decoder.module.js', 'react-dom/server'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
