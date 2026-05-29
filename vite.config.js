import dotenv from 'dotenv';
import { defineConfig } from 'vite';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  root: './examples',
  server: {
    port: 5173,
    allowedHosts: true
  },
});
