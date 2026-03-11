import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      // Resolve workspace packages directly from source, bypassing dist builds
      "@genga/contracts": path.resolve(
        __dirname,
        "../../packages/contracts/src/index.ts"
      ),
      "@genga/graph-core": path.resolve(
        __dirname,
        "../../packages/graph-core/src/index.ts"
      ),
      "@genga/identity-lock-sdk": path.resolve(
        __dirname,
        "../../packages/identity-lock-sdk/src/index.ts"
      ),
    },
  },
});