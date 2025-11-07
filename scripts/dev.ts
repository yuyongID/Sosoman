/**
 * Development bootstrap script.
 *
 * This script spins up the renderer dev server (Vite) and then launches the
 * Electron main process with hot-reload friendly settings. Keeping the logic in
 * TypeScript makes it easier to share helpers with the rest of the codebase.
 */
import concurrently from 'concurrently';

const viteCommand = {
  command: 'npx vite --config scripts/vite.config.ts',
  name: 'renderer',
  prefixColor: 'cyan',
};

const electronCommand = {
  // Ensure Electron does not fall back to Node-only mode when the user's shell
  // exports ELECTRON_RUN_AS_NODE (common on some setups).
  command: `cross-env ELECTRON_RUN_AS_NODE= BROWSER=none electron ./scripts/electron-main.cjs`,
  name: 'main',
  prefixColor: 'green',
};

concurrently([viteCommand, electronCommand], {
  killOthers: ['failure', 'success'],
  restartTries: 0,
  successCondition: 'first',
}).result.catch((error) => {
  console.error('\n[dev] Failed to bootstrap development environment.');
  if (error) {
    console.error(error);
  }
  process.exit(1);
});
