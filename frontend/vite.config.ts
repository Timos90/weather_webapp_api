import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Include this if you're using React

export default defineConfig({
  plugins: [react()], // Add this line if you haven't already
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // enable production source maps for debugging
  },
});
