import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const files=(dir:string)=>{try{return readdirSync(fileURLToPath(new URL(`./public/${dir}/`,import.meta.url))).filter(f=>f.endsWith('.mp3'));}catch{return [];}};

export default defineConfig({
  plugins: [react()],
  define:{__GST_BGM_FILES__:JSON.stringify(files('bgm')),__GST_SFX_FILES__:JSON.stringify(files('sfx'))},
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true },
});
