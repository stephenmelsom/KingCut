/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/KingCut/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
  },
});
