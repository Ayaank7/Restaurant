import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// 1. Get the default configuration from Lovable
const config = defineConfig();

// 2. Safely intercept and filter out the lovable-tagger plugin
if (config.plugins) {
  config.plugins = config.plugins.flat().filter((plugin: any) => {
    return plugin && plugin.name !== "lovable-tagger";
  });
}

// 3. Export the clean config
export default config;