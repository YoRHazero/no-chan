import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The dev server and build serve the playground; the library itself is
// consumed as source. A relative base lets the built playground run under
// GitHub Pages' /no-chan/ path.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
