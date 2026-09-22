//@ts-check
const { join } = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js

  // The design system is consumed straight from TypeScript source, so Next has
  // to compile it as part of this app.
  transpilePackages: ['@squadup.in/ui'],

  // Emit a self-contained server (.next/standalone) for the production image,
  // so it ships only the node_modules files this app actually imports.
  output: 'standalone',
  // Trace from the workspace root: dependencies are hoisted there by npm
  // workspaces, and the shared UI library lives outside this app.
  outputFileTracingRoot: join(__dirname, '../../'),
};

module.exports = nextConfig;
