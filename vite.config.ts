import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
const BUILD = String(Date.now())
const version = (): Plugin => ({ name: 'version-file', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: BUILD }) }) } })
// base './' works under any GitHub Pages repo path; navigation uses #hash routes, so no 404 problems.
export default defineConfig({ base: './', define: { __BUILD__: JSON.stringify(BUILD) }, plugins: [react(), version()] })
