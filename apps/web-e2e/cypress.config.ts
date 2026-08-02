const { nxE2EPreset } = require('@nx/cypress/plugins/cypress-preset');
const { defineConfig } = require('cypress');
module.exports = defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'src',
      webServerCommands: {
        default: 'npx nx run @squadup.in/web:serve',
      },
      ciWebServerCommand: 'npx nx run @squadup.in/web:start',
      ciBaseUrl: 'http://localhost:3001',
    }),
    baseUrl: 'http://127.0.0.1:3001',
  },
});
