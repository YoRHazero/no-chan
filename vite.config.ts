import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The dev server and build serve the playground; the library itself is
// consumed as source.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
