import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      // Development and Playwright must remain deterministic and must not
      // require production Cloudflare credentials in CI.
      remoteBindings: false,
    }),
  ],
});
