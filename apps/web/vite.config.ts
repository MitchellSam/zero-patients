import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/', // '/zero-patients/' on GitHub project Pages
  plugins: [react()],
  server: { port: 5173 },
});
