import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let scanned = false;

/**
 * Load the same env vars as tessell-website for Sanity (SANITY_PROJECT_ID, SANITY_DATASET, optional SANITY_TOKEN).
 * Prefers this repo’s `.env`, then optional overrides, then sibling tessell-web/tessell-website/.env.
 */
export function loadTessellWebsiteEnv(): void {
  if (scanned) return;
  scanned = true;

  const here = dirname(fileURLToPath(import.meta.url));
  const mcpRoot = join(here, '..');
  const candidates = [
    process.env.TESSELL_WEBSITE_ENV_PATH,
    process.env.TESSELL_WEBSITE_ROOT && join(process.env.TESSELL_WEBSITE_ROOT, '.env'),
    join(mcpRoot, '.env'),
    join(mcpRoot, '.env.local'),
    join(mcpRoot, '..', 'tessell-web', 'tessell-website', '.env'),
    join(mcpRoot, '..', '..', 'tessell-web', 'tessell-website', '.env'),
  ].filter((p): p is string => Boolean(p));

  for (const p of candidates) {
    if (existsSync(p)) {
      loadEnv({ path: p });
      return;
    }
  }
}
