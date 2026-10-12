import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi/relovia.json',
  output: 'src/app/api/generated',
  plugins: [
    {
      name: '@hey-api/client-angular',
      runtimeConfigPath: './src/app/api/hey-api',
    },
  ],
});
