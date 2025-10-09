import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

const require = createRequire(import.meta.url)
const zodV4CorePath = require.resolve('zod/v4/core')

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    tsconfigPaths(),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'zod/v4/core': zodV4CorePath,
      '@nestjs/swagger': fileURLToPath(
        new URL('./src/shims/nest-swagger.ts', import.meta.url),
      ),
      'class-transformer/storage': fileURLToPath(
        new URL('./src/shims/empty-module.ts', import.meta.url),
      ),
      '@grpc/proto-loader': fileURLToPath(
        new URL('./src/shims/empty-module.ts', import.meta.url),
      ),
      '@repo/types/dist/contracts/rpc/users.js': fileURLToPath(
        new URL('./src/shims/empty-module.ts', import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    include: ['zod', 'zod/v4', 'zod/v4/core'],
    exclude: ['@nestjs/swagger', 'class-transformer/storage', '@grpc/proto-loader'],
  },
  test: {
    environment: 'jsdom',
  },
})
