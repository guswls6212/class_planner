import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@entities": path.resolve(__dirname, "./src/domain/entities"),
      "@value-objects": path.resolve(__dirname, "./src/domain/value-objects"),
      "@application": path.resolve(__dirname, "./src/application"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@types": path.resolve(__dirname, "./src/shared/types"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@utils": path.resolve(__dirname, "./src/lib"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
    },
  },
});
