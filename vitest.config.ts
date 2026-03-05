import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@main": path.resolve(__dirname, "src/main"),
      "@common": path.resolve(__dirname, "src/common"),
      "@renderer": path.resolve(__dirname, "src/renderer"),
      "@components": path.resolve(__dirname, "src/renderer/components"),
      "@src": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "assets"),
      "@misc": path.resolve(__dirname, "misc"),
    },
  },
  test: {
    testTimeout: 60000,
    include: ["tests/**/*.test.ts"],
  },
});
