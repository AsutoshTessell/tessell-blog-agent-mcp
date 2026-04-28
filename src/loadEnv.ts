import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let scanned = false;

/**
 * Load `SANITY_*` and related variables from this repo only:
 * `tessell-blog-agent-mcp/.env`, then `.env.local` (first file found wins; no merge).
 */
export function loadSanityBlogEnv(): void {
  if (scanned) return;
  scanned = true;

  const here = dirname(fileURLToPath(import.meta.url));
  const mcpRoot = join(here, '..');
  const candidates = [join(mcpRoot, '.env'), join(mcpRoot, '.env.local')];

  for (const p of candidates) {
    if (existsSync(p)) {
      loadEnv({ path: p });
      return;
    }
  }
}
