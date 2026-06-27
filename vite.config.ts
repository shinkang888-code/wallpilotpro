// WallPilot TanStack Start config — do NOT duplicate bundled plugins (tanstackStart, viteReact, tailwindcss, nitro, etc.).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      sourcemap: false,
    },
  },
  // Vercel by default; set NITRO_PRESET=node-server for Render Docker deploy.
  nitro:
    process.env.NITRO_PRESET === "node-server"
      ? { preset: "node-server" }
      : {
          preset: "vercel",
          vercel: {
            functions: {
              maxDuration: 120,
            },
          },
        },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
