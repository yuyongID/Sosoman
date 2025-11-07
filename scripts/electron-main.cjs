/**
 * Electron bootstrap for the TypeScript main process during development.
 *
 * Electron expects a JavaScript entry file. This shim registers ts-node so the
 * TypeScript sources can be required without a prebuild step.
 */
const path = require('path');

if (!process.env.TS_NODE_PROJECT) {
  process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.json');
}

require('ts-node/register/transpile-only');

try {
  require('../src/main/app');
} catch (error) {
  console.error('[electron-dev] Failed to load main process entry', error);
  throw error;
}
