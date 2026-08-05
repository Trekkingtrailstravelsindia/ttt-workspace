import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  preset: process.env.NITRO_PRESET || "node-server",
  rollupConfig: {
    output: {
      format: "esm",
    },
  },
});
