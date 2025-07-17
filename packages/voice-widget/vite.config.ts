import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        widget: path.resolve(__dirname, 'src/VoiceWidget.tsx'),
        embed: path.resolve(__dirname, 'src/embed.ts'),
      },
      name: 'CoconutVoiceWidget',
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
