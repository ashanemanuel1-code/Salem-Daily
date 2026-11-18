import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' works under any GitHub Pages repo path; navigation uses #hash routes, so no 404 problems.
export default defineConfig({ base: './', plugins: [react()] })
