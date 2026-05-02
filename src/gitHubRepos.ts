import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_REPOS = 20;
const CLONE_DEPTH = 400;
const MAX_COMMITS_CAP = 5000;

function githubBasicAuthHeader(token: string): string {
  const raw = `x-access-token:${token.trim()}`;
  const b64 = Buffer.from(raw, 'utf8').toString('base64');
  return `Authorization: Basic ${b64}`;
}

/** `-c` args for git when talking to github.com with a PAT (token never stored in remote URL). */
function gitGithubAuthConfigArgs(cwd: string, token?: string): string[] {
  const safe = ['-c', `safe.directory=${cwd}`];
  if (!token?.trim()) return safe;
  return [...safe, '-c', `http.extraHeader=${githubBasicAuthHeader(token)}`];
}

export function parseCommaSeparatedRepos(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim().replace(/^["'\[]+/, '').replace(/["'\]]+$/, ''))
    .filter(Boolean);
}

export type ParsedGithubRepo = { owner: string; repo: string };

/** Accept `https://github.com/org/repo`, trailing slash, `.git`, or `git@github.com:org/repo.git`. */
export function parseGithubRepoUrl(input: string): ParsedGithubRepo | null {
  const s = input.trim();
  const https = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (https) {
    return { owner: https[1], repo: https[2].replace(/\.git$/i, '') };
  }
  const ssh = s.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) {
    return { owner: ssh[1], repo: ssh[2].replace(/\.git$/i, '') };
  }
  return null;
}

export function publicHttpsCloneUrl(parsed: ParsedGithubRepo): string {
  return `https://github.com/${parsed.owner}/${parsed.repo}.git`;
}

export function displayRepoLabel(parsed: ParsedGithubRepo): string {
  return `${parsed.owner}/${parsed.repo}`;
}

export function resolveGitCacheRoot(mcpRoot: string): string {
  const e = process.env.TESSELL_GIT_CACHE_DIR?.trim();
  if (e) return path.resolve(e);
  return path.join(mcpRoot, '.data', 'git-cache');
}

export function resolveMaxGithubRepos(explicit?: number): number {
  if (typeof explicit === 'number' && !Number.isNaN(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), 100);
  }
  const env = process.env.TESSELL_GITHUB_MAX_REPOS?.trim();
  if (env) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return Math.min(n, 100);
  }
  return DEFAULT_MAX_REPOS;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shallow clone or fetch+fast-forward default branch. Remote URL stays token-free; auth via -c http.extraHeader when token set.
 */
export async function ensureGithubRepoCloned(options: {
  repoUrl: string;
  token?: string;
  cacheRoot: string;
}): Promise<{ cwd: string; label: string; publicUrl: string }> {
  const parsed = parseGithubRepoUrl(options.repoUrl);
  if (!parsed) {
    throw new Error(
      `Unsupported repo URL (use https://github.com/org/repo or git@github.com:org/repo.git): ${options.repoUrl}`
    );
  }
  const publicUrl = publicHttpsCloneUrl(parsed);
  const label = displayRepoLabel(parsed);
  const dirName = `${parsed.owner}--${parsed.repo}`;
  const cwd = path.join(options.cacheRoot, dirName);
  await fs.mkdir(options.cacheRoot, { recursive: true });

  const gitMarker = path.join(cwd, '.git');
  const maxBuffer = 100 * 1024 * 1024;
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

  if (!(await pathExists(gitMarker))) {
    const parent = options.cacheRoot;
    const cloneArgs = [
      ...gitGithubAuthConfigArgs(cwd, options.token),
      'clone',
      '--depth',
      String(CLONE_DEPTH),
      '--single-branch',
      publicUrl,
      cwd,
    ];
    await execFileAsync('git', cloneArgs, { maxBuffer, encoding: 'utf8', env });
    return { cwd, label, publicUrl };
  }

  const fetchArgs = [
    ...gitGithubAuthConfigArgs(cwd, options.token),
    '-C',
    cwd,
    'fetch',
    'origin',
    '--prune',
  ];
  await execFileAsync('git', fetchArgs, { maxBuffer, encoding: 'utf8', env });

  try {
    await execFileAsync(
      'git',
      [...gitGithubAuthConfigArgs(cwd, options.token), '-C', cwd, 'pull', '--ff-only'],
      { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8', env }
    );
  } catch {
    let branch = 'main';
    try {
      const { stdout } = await execFileAsync('git', ['-C', cwd, 'symbolic-ref', '--short', 'HEAD'], {
        encoding: 'utf8',
      });
      branch = stdout.trim() || 'main';
    } catch {
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'],
          { encoding: 'utf8' }
        );
        branch = stdout.trim() || 'main';
      } catch {
        branch = 'main';
      }
    }
    await execFileAsync(
      'git',
      [
        ...gitGithubAuthConfigArgs(cwd, options.token),
        '-C',
        cwd,
        'fetch',
        'origin',
        branch,
        '--depth',
        String(CLONE_DEPTH),
      ],
      { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8', env }
    );
    await execFileAsync(
      'git',
      [...gitGithubAuthConfigArgs(cwd, options.token), '-C', cwd, 'reset', '--hard', `origin/${branch}`],
      { maxBuffer: 30 * 1024 * 1024, encoding: 'utf8', env }
    );
  }

  return { cwd, label, publicUrl };
}

export function resolveMaxCommits(explicit?: number): number {
  if (typeof explicit === 'number' && !Number.isNaN(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), MAX_COMMITS_CAP);
  }
  return 350;
}

/** Same semantics as read_tessell_ui_features: subject + body, or oneline; optional revision hash. */
export async function readGitLogPretty(options: {
  cwd: string;
  daysBack: number;
  onelineOnly: boolean;
  revisionDetails: boolean;
  maxCommits: number;
}): Promise<string> {
  const maxBuffer = 50 * 1024 * 1024;
  const maxCommits = Math.min(Math.max(1, options.maxCommits), MAX_COMMITS_CAP);
  const cwd = options.cwd;
  const safeArgs = gitGithubAuthConfigArgs(cwd, undefined);

  if (options.onelineOnly) {
    const { stdout } = await execFileAsync(
      'git',
      [...safeArgs, '-C', cwd, 'log', `--since=${options.daysBack} days ago`, '--no-merges', '--oneline', '-n', String(maxCommits)],
      { cwd, maxBuffer, encoding: 'utf8' }
    );
    return stdout;
  }

  const pretty = options.revisionDetails
    ? '---%n%n**Revision** `%H`%n%n%s%n%n%b%n'
    : '---%n%n%s%n%n%b%n';

  const { stdout } = await execFileAsync(
    'git',
    [
      ...safeArgs,
      '-C',
      cwd,
      'log',
      `--since=${options.daysBack} days ago`,
      '--no-merges',
      '-n',
      String(maxCommits),
      `--pretty=format:${pretty}`,
    ],
    { cwd, maxBuffer, encoding: 'utf8' }
  );
  return stdout.trimEnd();
}

/** Stable dedupe key for a repo URL. */
export function repoDedupeKey(url: string): string {
  const p = parseGithubRepoUrl(url);
  if (p) return `${p.owner}/${p.repo}`.toLowerCase();
  return createHash('sha256').update(url.trim()).digest('hex').slice(0, 16);
}
