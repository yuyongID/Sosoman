/**
 * Development bridge for loading the TypeScript preload script.
 *
 * Electron requires a JavaScript entry file, so we register ts-node on the fly
 * and then forward to the actual TypeScript module living under src/main/preload.
 */
const path = require('path');

if (!process.env.TS_NODE_PROJECT) {
  process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.json');
}

require('ts-node/register/transpile-only');

try {
  require(path.resolve(__dirname, '../src/main/preload'));
} catch (error) {
  console.error('[preload-dev] Failed to load preload entry', error);
  throw error;
}
