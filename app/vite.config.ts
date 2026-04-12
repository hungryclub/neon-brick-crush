import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/neon-brick-crush/',
  plugins: [react()]
});
