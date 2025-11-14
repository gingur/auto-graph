import { defineConfig } from 'tsdown';

const baseConfig = {
  exports: true,
  platform: 'neutral',
} as const;

export default defineConfig((options) => {
  if (options?.watch) {
    return {
      ...baseConfig,
      format: 'esm',
    };
  }
  return {
    ...baseConfig,
    dts: true,
    format: ['esm', 'cjs'],
  };
});
