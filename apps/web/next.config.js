//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js

  // The design system is consumed straight from TypeScript source, so Next has
  // to compile it as part of this app.
  transpilePackages: ['@squadup.in/ui'],
};

module.exports = nextConfig;
