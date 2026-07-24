import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

// Wrap the export in a function to get access to the 'mode' (e.g., 'test')
export default defineConfig(({ mode }) => {
  
  // Load environment variables from .env files in the project root
  // process.cwd() refers to the backend root directory (where package.json is)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      // Make globals (describe, it, expect) automatically available
      globals: true,
      // Use forks pool for process-level isolation — prevents vi.mock leaks between test files
      pool: 'forks',
      coverage: {
        provider: 'v8', // or 'istanbul'
        reporter: ['text', 'json', 'html'],
      },
      // Define environment variables for the test process
      env: {
        ...env, // Spread all variables loaded from .env files
        NODE_ENV: 'test', // Explicitly set the node environment for tests
        
        // Explicitly map the required secrets to ensure they are loaded.
        // This makes 'process.env.ENCRYPTION_SECRET' available to your scripts.
        ENCRYPTION_SECRET: env.ENCRYPTION_SECRET, 
        DATABASE_URI: env.DATABASE_URI,
        JIRA_SECRET: env.JIRA_SECRET,
        JIRA_SALT: env.JIRA_SALT,
        // ... add any other secrets the app needs during testing
      },
    },
    resolve: {
      // Important so that vitest understands shared folders alias
      alias: {
        '@shared': path.resolve(__dirname, '../shared/src'),
      },
    },
  };
});