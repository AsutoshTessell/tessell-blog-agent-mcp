#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BLOG_POSTS_QUERY } from './blogQueries.js';
import { BLOG_CATEGORIES_QUERY, BLOG_TAGS_QUERY } from './blogTaxonomyQueries.js';
import { BLOG_IMAGE_EXAMPLES_QUERY } from './blogImageExamplesQuery.js';
import { loadSanityBlogEnv } from './loadEnv.js';
import { createSanityReadClientWithMeta } from './sanityToolHelpers.js';
import { markdownToSanityBlogPayloads } from './markdownToSanityBlog.js';
import { publishBlogPostToSanity, resolveBlogPostDocument } from './publishBlogToSanity.js';
import {
  BLOG_STYLE_GUIDE,
  PREFERRED_SAMPLE_SLUGS,
  BLOG_SAMPLE_PREFERRED_QUERY,
  BLOG_SAMPLE_FALLBACK_QUERY,
} from './blogStyleGuide.js';

const execFileAsync = promisify(execFile);

function resolveMaxCommits(explicit?: number): number {
  if (typeof explicit === 'number' && !Number.isNaN(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), 5000);
  }
  return 350;
}

function sameAbsolutePath(a: string, b: string): boolean {
  return path.normalize(path.resolve(a.trim())) === path.normalize(path.resolve(b.trim()));
}

/**
 * Where `save_blog_draft` writes when `draftsFolderPath` is omitted:
 * `TESSELL_BLOG_DRAFTS_DIR`, else `<this-repo>/drafts` (not tessell-web).
 */
function resolveDraftsFolderPath(explicit?: string | null): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  const fromEnv = process.env.TESSELL_BLOG_DRAFTS_DIR?.trim();
  if (fromEnv) return fromEnv;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', 'drafts');
}

/** Absolute tessell-ui clone path — optional `TESSELL_UI_REPO` when `repoPath` omitted */
function resolveTessellUiRepoPath(explicit?: string | null): string {
  const t = explicit?.trim();
  if (t) return path.resolve(t);
  const env = process.env.TESSELL_UI_REPO?.trim();
  if (env) return path.resolve(env);
  throw new Error(
    'Missing tessell-ui repo path: set TESSELL_UI_REPO or pass repoPath in tool arguments.'
  );
}

function resolveDaysBack(explicit?: number): number {
  if (typeof explicit === 'number' && !Number.isNaN(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const e = process.env.TESSELL_BLOG_DAYS_BACK?.trim();
  if (e) {
    const n = parseInt(e, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 15;
}

function defaultSanityPayloadsJsonPath(markdownFilePath: string): string {
  const abs = path.resolve(markdownFilePath.trim());
  const dir = path.dirname(abs);
  const stem = path.basename(abs, path.extname(abs));
  return path.join(dir, `${stem}.sanity-payloads.json`);
}

/** Load Sanity-related env from tessell-blog-agent-mcp `.env` or `.env.local`. */
loadSanityBlogEnv();

const server = new Server(
  {
    name: 'tessell-blog-agent',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_tessell_ui_features',
        description:
          'Reads recent tessell-ui **merge/squash commit messages only** — no patches, no file lists, no `git diff`. That text is typically the same narrative as the GitHub PR (title = first line / subject, PR description ≈ commit body after squash-merge). Optional `revisionDetails:true` adds commit hashes for troubleshooting. Use with get_blog_style_guide to decide what merits a blog post.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: {
              type: 'string',
              description:
                'Absolute path to the tessell-ui repository. Optional if TESSELL_UI_REPO is set in the MCP environment.',
            },
            daysBack: {
              type: 'number',
              description: 'Git log window in days (default: TESSELL_BLOG_DAYS_BACK env or 15)',
            },
            onelineOnly: {
              type: 'boolean',
              description:
                'If true, return only `git log --oneline` (titles only). If false (default), return subject + full message body for each commit — closest to PR title + PR description.',
            },
            revisionDetails: {
              type: 'boolean',
              description:
                'If true, prepend each commit with its revision hash (`git` SHA). Default false — output looks like stacked PR summaries, not “show me code changes”.',
            },
            maxCommits: {
              type: 'number',
              description:
                'Safety cap on how many merged commits to serialize (default 350, cap 5000). Limits markdown length only — still no diffs.',
            },
          },
        },
      },
      {
        name: 'get_published_blogs',
        description:
          'Lists all published blog posts (title, slug, summary, category). Use this to: (1) avoid duplicating existing content, (2) analyze which categories and topics are well-covered vs underserved, (3) understand what Tessell considers blog-worthy, (4) decide whether your new content fits an existing post\'s topic or needs a fresh angle. Study titles and summaries to match the naming style.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_blog_categories_and_tags',
        description:
          'Fetches latest blogCategory and blogTag documents from Sanity (GROQ: _id, name, slug). Excludes archived and draft taxonomy rows. Call this before every draft to pick exact names for `category` / `tags` in frontmatter. The markdown_to_sanity_blog tool re-fetches the same lists on each run to resolve labels to references (TESSELL_DEFAULT_BLOG_* is not used for taxonomy).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_blog_image_asset_examples',
        description:
          'Returns up to 15 recent blog posts that have a thumbnailImage, with thumbnailAssetRef and mainAssetRef (Sanity image asset _ref strings). Reuse refs in draft frontmatter as thumbnailImageAssetRef / mainImageAssetRef so blog cards show an image, or upload new assets in Studio.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'save_blog_draft',
        description:
          'Saves the Markdown blog draft under this MCP repo\'s `drafts/` folder by default (or `TESSELL_BLOG_DRAFTS_DIR`). Override with `draftsFolderPath` only if you want another location.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the blog post (will be used to generate the filename).',
            },
            markdownContent: {
              type: 'string',
              description: 'The full Markdown content of the drafted blog post.',
            },
            draftsFolderPath: {
              type: 'string',
              description:
                'Optional. Absolute path to a drafts folder. If omitted: `TESSELL_BLOG_DRAFTS_DIR` env, else `<tessell-blog-agent-mcp>/drafts`.',
            },
          },
          required: ['title', 'markdownContent'],
        },
      },
      {
        name: 'markdown_to_sanity_blog',
        description:
          'Converts Markdown + frontmatter to apiReady blogPost JSON. Fetches latest blogCategory/blogTag from Sanity and matches `category`/`tags` or ref fields in frontmatter. When `markdownFilePath` is set, always writes `<stem>.sanity-payloads.json` beside that file (optional `outputPayloadsJsonPath` for a second copy elsewhere). Optional image asset refs; see get_blog_image_asset_examples.',
        inputSchema: {
          type: 'object',
          properties: {
            markdownFilePath: {
              type: 'string',
              description: 'Absolute path to a .md file (with frontmatter).',
            },
            markdown: {
              type: 'string',
              description: 'Raw Markdown string if not using a file.',
            },
            outputPayloadsJsonPath: {
              type: 'string',
              description:
                'Optional extra path for the JSON result. If omitted but markdownFilePath is set, `<stem>.sanity-payloads.json` is written next to the Markdown file.',
            },
          },
        },
      },
      {
        name: 'publish_blog_to_sanity',
        description:
          'Writes a blog post to Sanity using createOrReplace (mutations API). Requires SANITY_TOKEN with write access. MCP-enforced behavior: always sets `draft: true` and always generates Tessell-themed card images from title+summary (overwriting thumbnail/main image refs for consistency). Markdown path uses live taxonomy fetch from Sanity (same as markdown_to_sanity_blog). dryRun skips uploads.',
        inputSchema: {
          type: 'object',
          properties: {
            markdownFilePath: {
              type: 'string',
              description: 'Absolute path to a .md draft; document is built from Markdown + frontmatter.',
            },
            sanityPayloadsJsonPath: {
              type: 'string',
              description:
                'Absolute path to a JSON file containing { apiReady: { document } } (e.g. *.sanity-payloads.json).',
            },
            documentJson: {
              type: 'string',
              description: 'Stringified blogPost document (same shape as apiReady.document).',
            },
            dryRun: {
              type: 'boolean',
              description: 'If true, resolve the document but do not call Sanity (no token required for resolution only if source parses).',
            },
            dataset: {
              type: 'string',
              description: 'Override SANITY_DATASET (default: staging or env).',
            },
            generateCardImageFromContent: {
              type: 'boolean',
              description:
                'Deprecated toggle kept for backward compatibility. Card image generation is always enabled by this MCP server.',
            },
          },
        },
      },
      {
        name: 'get_blog_style_guide',
        description:
          'Returns the Tessell blog writing style guide AND content strategy. Covers: tone, structure, title patterns, engagement techniques, anti-patterns, how to ground posts in tessell-ui merge messages (subject + body ≈ PR title + PR description), PLUS — how to decide one post vs multiple, what deserves a blog vs what doesn\'t, the "What → Why → How It Helps" section pattern for each feature, audience understanding, how to learn from published blog patterns, AND the secondary "Platform Update" post strategy for skipped items (so marketing has visibility into all changes). Call this BEFORE writing any draft.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_published_blog_samples',
        description:
          'Fetches well-written published blog posts with FULL body text from Sanity. Study them to learn: how sections are structured (What → Why → How), how subheadings tell a story, how each feature is explained with context and business impact, how openings hook readers, and how closings deliver a takeaway. Write your draft to match this quality. Also use these to judge what level of content Tessell publishes — if the changes you have don\'t meet this bar, consolidate or skip.',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of sample posts to fetch (default: 3, max: 5).',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'read_tessell_ui_features') {
    try {
      const raw = request.params.arguments as
        | {
            repoPath?: string;
            daysBack?: number;
            onelineOnly?: boolean;
            maxCommits?: number;
            revisionDetails?: boolean;
          }
        | undefined;
      const cwd = resolveTessellUiRepoPath(raw?.repoPath);
      const daysBack = resolveDaysBack(raw?.daysBack);
      const onelineOnly = Boolean(raw?.onelineOnly);
      const revisionDetails = Boolean(raw?.revisionDetails);
      const maxCommits = resolveMaxCommits(raw?.maxCommits);
      /** Child-process stdout cap (bytes)—not inspecting “how many lines changed”; just overflow protection. */
      const maxBuffer = 50 * 1024 * 1024;

      if (onelineOnly) {
        const { stdout } = await execFileAsync(
          'git',
          [
            'log',
            `--since=${daysBack} days ago`,
            '--oneline',
            '--no-merges',
            '-n',
            String(maxCommits),
          ],
          { cwd, maxBuffer, encoding: 'utf8' }
        );
        return {
          content: [{ type: 'text', text: stdout }],
        };
      }

      /** Subject + body only (%s / %b) — same prose Git stores for squash merges; hashes optional via revisionDetails. */
      const pretty = revisionDetails
        ? '---%n%n**Revision** `%H`%n%n%s%n%n%b%n'
        : '---%n%n%s%n%n%b%n';

      const { stdout } = await execFileAsync(
        'git',
        [
          'log',
          `--since=${daysBack} days ago`,
          '--no-merges',
          '-n',
          String(maxCommits),
          `--pretty=format:${pretty}`,
        ],
        { cwd, maxBuffer, encoding: 'utf8' }
      );

      const header = [
        `# Recent tessell-ui work (${daysBack}-day window)`,
        '',
        '**Included:** merged commit **titles** (`%s`) and **message bodies** (`%b`) only — comparable to GitHub **PR title + PR description** when teams squash-merge.',
        '**Excluded:** patches, `--stat`, and file-level diffs. Open the PR in GitHub `(#NNNN)` from the title if you need discussion beyond the squash message.',
        '',
      ].join('\n');

      return {
        content: [{ type: 'text', text: header + stdout.trimEnd() + '\n' }],
      };
    } catch (e: any) {
      if (typeof e?.message === 'string' && e.message.includes('tessell-ui')) {
        throw new McpError(ErrorCode.InvalidParams, e.message);
      }
      throw new McpError(ErrorCode.InternalError, `Failed to read git log: ${e.message}`);
    }
  }

  if (request.params.name === 'get_published_blogs') {
    try {
      const { client, projectId, dataset } = createSanityReadClientWithMeta();

      const result = await client.fetch(BLOG_POSTS_QUERY);
      const meta = {
        sanityProjectId: projectId,
        sanityDataset: dataset,
        resultCount: Array.isArray(result) ? result.length : 0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ meta, result }, null, 2),
          },
        ],
      };
    } catch (e: any) {
      if (e instanceof McpError) throw e;
      throw new McpError(ErrorCode.InternalError, `Sanity fetch failed: ${e.message}`);
    }
  }

  if (request.params.name === 'get_blog_categories_and_tags') {
    try {
      const { client, projectId, dataset } = createSanityReadClientWithMeta();

      const [categories, tags] = await Promise.all([
        client.fetch(BLOG_CATEGORIES_QUERY),
        client.fetch(BLOG_TAGS_QUERY),
      ]);

      const meta = {
        sanityProjectId: projectId,
        sanityDataset: dataset,
        categoryCount: Array.isArray(categories) ? categories.length : 0,
        tagCount: Array.isArray(tags) ? tags.length : 0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ meta, categories, tags }, null, 2),
          },
        ],
      };
    } catch (e: any) {
      if (e instanceof McpError) throw e;
      throw new McpError(ErrorCode.InternalError, `Sanity taxonomy fetch failed: ${e.message}`);
    }
  }

  if (request.params.name === 'get_blog_image_asset_examples') {
    try {
      const { client, projectId, dataset } = createSanityReadClientWithMeta();

      const examples = await client.fetch(BLOG_IMAGE_EXAMPLES_QUERY);
      const meta = {
        sanityProjectId: projectId,
        sanityDataset: dataset,
        count: Array.isArray(examples) ? examples.length : 0,
        hint:
          'Use thumbnailAssetRef (or mainAssetRef) in markdown frontmatter as thumbnailImageAssetRef / mainImageAssetRef — they must be existing image asset _refs in this dataset.',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ meta, examples }, null, 2),
          },
        ],
      };
    } catch (e: any) {
      if (e instanceof McpError) throw e;
      throw new McpError(ErrorCode.InternalError, `Sanity image examples fetch failed: ${e.message}`);
    }
  }

  if (request.params.name === 'markdown_to_sanity_blog') {
    const args = (request.params.arguments || {}) as {
      markdownFilePath?: string;
      markdown?: string;
      outputPayloadsJsonPath?: string;
    };
    if (!args.markdown?.trim() && !args.markdownFilePath?.trim()) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Provide either markdown (string) or markdownFilePath (absolute path to .md).'
      );
    }
    try {
      const result = await markdownToSanityBlogPayloads({
        markdown: args.markdown,
        markdownFilePath: args.markdownFilePath,
      });

      const jsonText = JSON.stringify(result, null, 2);
      const mdPath = args.markdownFilePath?.trim();
      const explicitOut = args.outputPayloadsJsonPath?.trim();
      const savedPaths: string[] = [];
      const besideMd = mdPath ? defaultSanityPayloadsJsonPath(mdPath) : null;
      if (besideMd) {
        await fs.mkdir(path.dirname(besideMd), { recursive: true });
        await fs.writeFile(besideMd, jsonText, 'utf-8');
        savedPaths.push(besideMd);
      }
      if (explicitOut && (!besideMd || !sameAbsolutePath(explicitOut, besideMd))) {
        await fs.mkdir(path.dirname(explicitOut), { recursive: true });
        await fs.writeFile(explicitOut, jsonText, 'utf-8');
        savedPaths.push(explicitOut);
      }

      const content: Array<{ type: 'text'; text: string }> = [{ type: 'text', text: jsonText }];
      if (savedPaths.length > 0) {
        content.push({
          type: 'text',
          text: `Saved full payloads to:\n${savedPaths.join('\n')}`,
        });
      }

      return { content };
    } catch (e: any) {
      throw new McpError(ErrorCode.InternalError, e.message || String(e));
    }
  }

  if (request.params.name === 'publish_blog_to_sanity') {
    const args = (request.params.arguments || {}) as {
      markdownFilePath?: string;
      sanityPayloadsJsonPath?: string;
      documentJson?: string;
      dryRun?: boolean;
      dataset?: string;
      generateCardImageFromContent?: boolean;
    };
    try {
      const document = await resolveBlogPostDocument({
        markdownFilePath: args.markdownFilePath,
        sanityPayloadsJsonPath: args.sanityPayloadsJsonPath,
        documentJson: args.documentJson,
      });
      const result = await publishBlogPostToSanity(document, {
        dryRun: Boolean(args.dryRun),
        dataset: args.dataset?.trim() || undefined,
        // Backward-compatible input: ignored by publisher, images are always generated.
        generateCardImageFromContent: Boolean(args.generateCardImageFromContent),
      });
      const payload = {
        ...result,
        reminder: result.dryRun
          ? 'Dry run only — no write to Sanity.'
          : result.generatedImageAssetId
            ? `Generated card image uploaded to Sanity (asset id in generatedImageAssetId). Authors may still be required in Studio.`
            : 'Open in Studio if authors or manual image tweaks are still required.',
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (e: any) {
      throw new McpError(ErrorCode.InternalError, e.message || String(e));
    }
  }

  if (request.params.name === 'save_blog_draft') {
    const { title, markdownContent, draftsFolderPath } = request.params.arguments as any;
    const folder = resolveDraftsFolderPath(draftsFolderPath);

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const fileName = `${slug}.md`;
    const filePath = path.join(folder, fileName);

    try {
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(filePath, markdownContent, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `Successfully saved draft to: ${filePath}\n\nYou can view and edit the markdown file before publishing it to Sanity.`,
          },
        ],
      };
    } catch (e: any) {
      throw new McpError(ErrorCode.InternalError, `Failed to write file: ${e.message}`);
    }
  }

  if (request.params.name === 'get_blog_style_guide') {
    return {
      content: [{ type: 'text', text: BLOG_STYLE_GUIDE }],
    };
  }

  if (request.params.name === 'get_published_blog_samples') {
    try {
      const { client, projectId, dataset } = createSanityReadClientWithMeta({ useCdn: false });
      const count = Math.min((request.params.arguments as any)?.count || 3, 5);

      let samples = await client.fetch(BLOG_SAMPLE_PREFERRED_QUERY, {
        slugs: PREFERRED_SAMPLE_SLUGS,
      });
      if (!samples?.length) {
        const fallback = BLOG_SAMPLE_FALLBACK_QUERY.replace('[0...3]', `[0...${count}]`);
        samples = await client.fetch(fallback);
      } else if (samples.length > count) {
        samples = samples.slice(0, count);
      }

      const formatted = (samples as any[]).map((p: any) => ({
        title: p.name,
        slug: p.slug,
        category: p.category,
        summary: p.postSummary,
        publishedDate: p.publishedDate,
        bodyText: (p.bodyText || []).join(' '),
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                instruction: [
                  'These are real published Tessell blog posts. Study them to understand the PATTERNS Tessell uses:',
                  '',
                  '1. IDENTIFY each post\'s pattern: Is it an announcement, a problem→solution narrative, a practitioner deep dive, or a platform update? Note the structure.',
                  '2. FIND the sample(s) most similar to what you are about to write. Mirror that structure.',
                  '3. NOTE how each post handles: opening hooks, section headings (story-driven vs label-driven), paragraph-to-bullet ratio, customer quotes, closing takeaways.',
                  '4. DO NOT force a single rigid pattern. If your content is an announcement, write like the announcement sample. If it\'s a technical update, write like the practitioner sample.',
                  '5. IMPROVE where you can — better hook, clearer examples, stronger close — but stay consistent with the brand voice.',
                ].join('\n'),
                samples: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      if (e instanceof McpError) throw e;
      throw new McpError(ErrorCode.InternalError, `Failed to fetch blog samples: ${e.message}`);
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tessell Blog MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
