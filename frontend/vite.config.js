import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

function crossOriginIsolation() {
  return {
    name: 'cross-origin-isolation',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader(
          'Cross-Origin-Opener-Policy',
          'same-origin'
        )

        res.setHeader(
          'Cross-Origin-Embedder-Policy',
          'require-corp'
        )

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    crossOriginIsolation(),
  ],
})