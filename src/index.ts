#!/usr/bin/env node
import { createClient } from '@sanity/client';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { BLOG_POSTS_QUERY } from './blogQueries.js';
import { BLOG_CATEGORIES_QUERY, BLOG_TAGS_QUERY } from './blogTaxonomyQueries.js';
import { loadTessellWebsiteEnv } from './loadEnv.js';
import { markdownToSanityBlogPayloads } from './markdownToSanityBlog.js';
import { publishBlogPostToSanity, resolveBlogPostDocument } from './publishBlogToSanity.js';

const execAsync = promisify(exec);

/** Load tessell-website/.env before reading tools (same SANITY_* as Next.js). */
loadTessellWebsiteEnv();

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
        description: 'Scans the git history of the tessell-ui repository to find recent feature commits.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: {
              type: 'string',
              description: 'Absolute path to the tessell-ui repository on the local machine.',
            },
            daysBack: {
              type: 'number',
              description: 'Number of days back to look for commits (default: 14)',
            },
          },
          required: ['repoPath'],
        },
      },
      {
        name: 'get_published_blogs',
        description:
          'Lists blog posts using the same Sanity query as localhost:3000/blog (BLOG_POSTS_QUERY). Loads `.env` in this repo first (copy from `.env.example`), then optional TESSELL_WEBSITE_* paths, then sibling tessell-web/tessell-website/.env. Uses @sanity/client.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_blog_categories_and_tags',
        description:
          'Fetches existing blogCategory and blogTag documents from Sanity (GROQ: _id, name, slug). Excludes archived and draft taxonomy rows. Same env as get_published_blogs. Use _id values in frontmatter blogCategoryRef / blogTagsRefs or TESSELL_DEFAULT_* in .env.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'save_blog_draft',
        description: 'Saves the AI generated Markdown blog draft to a file in the cms/drafts folder.',
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
              description: 'The absolute path to the drafts folder (e.g. /Users/name/tessell-web/cms/drafts).',
            },
          },
          required: ['title', 'markdownContent', 'draftsFolderPath'],
        },
      },
      {
        name: 'markdown_to_sanity_blog',
        description:
          'Converts a Markdown draft (optional YAML frontmatter) into (1) apiReady: blogPost JSON with Portable Text postBody for Sanity mutate/createOrReplace, and (2) studioFriendly: flat strings. Required fields blogCategory + blogTags: use frontmatter blogCategoryRef and blogTagsRefs (or .env TESSELL_DEFAULT_BLOG_CATEGORY_REF / TESSELL_DEFAULT_BLOG_TAG_REFS). Authors/images not set here.',
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
          },
        },
      },
      {
        name: 'publish_blog_to_sanity',
        description:
          'Writes a blog post to Sanity using createOrReplace (mutations API). Requires SANITY_TOKEN with write access. Same sources as markdown_to_sanity_blog; env defaults fill blogCategory/blogTags if missing. Optional dryRun. After write, Studio may still need authors and images.',
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
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'read_tessell_ui_features') {
    const { repoPath, daysBack = 14 } = request.params.arguments as any;
    try {
      const { stdout } = await execAsync(`git log --since="${daysBack} days ago" --oneline`, {
        cwd: repoPath,
      });
      return {
        content: [{ type: 'text', text: stdout }],
      };
    } catch (e: any) {
      throw new McpError(ErrorCode.InternalError, `Failed to read git log: ${e.message}`);
    }
  }

  if (request.params.name === 'get_published_blogs') {
    try {
      loadTessellWebsiteEnv();
      const projectId = process.env.SANITY_PROJECT_ID;
      if (!projectId) {
        throw new McpError(
          ErrorCode.InternalError,
          'SANITY_PROJECT_ID is missing. Add tessell-blog-agent-mcp/.env (see .env.example), or point TESSELL_WEBSITE_ENV_PATH at tessell-website/.env, or export SANITY_* in the MCP process.'
        );
      }
      const dataset = process.env.SANITY_DATASET || 'staging';

      const client = createClient({
        projectId,
        dataset,
        apiVersion: '2024-01-01',
        // Match tessell-website/sanity/lib/client.tsx (dev = Live API, prod = CDN)
        useCdn: process.env.NODE_ENV === 'production',
        perspective: 'published',
        token: process.env.SANITY_TOKEN || process.env.SANITY_READ_TOKEN || undefined,
      });

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
      loadTessellWebsiteEnv();
      const projectId = process.env.SANITY_PROJECT_ID;
      if (!projectId) {
        throw new McpError(
          ErrorCode.InternalError,
          'SANITY_PROJECT_ID is missing. Add tessell-blog-agent-mcp/.env (see .env.example), or point TESSELL_WEBSITE_ENV_PATH at tessell-website/.env, or export SANITY_* in the MCP process.'
        );
      }
      const dataset = process.env.SANITY_DATASET || 'staging';

      const client = createClient({
        projectId,
        dataset,
        apiVersion: '2024-01-01',
        useCdn: process.env.NODE_ENV === 'production',
        perspective: 'published',
        token: process.env.SANITY_TOKEN || process.env.SANITY_READ_TOKEN || undefined,
      });

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

  if (request.params.name === 'markdown_to_sanity_blog') {
    const args = (request.params.arguments || {}) as {
      markdownFilePath?: string;
      markdown?: string;
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
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
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
    };
    try {
      loadTessellWebsiteEnv();
      const document = await resolveBlogPostDocument({
        markdownFilePath: args.markdownFilePath,
        sanityPayloadsJsonPath: args.sanityPayloadsJsonPath,
        documentJson: args.documentJson,
      });
      const result = await publishBlogPostToSanity(document, {
        dryRun: Boolean(args.dryRun),
        dataset: args.dataset?.trim() || undefined,
      });
      const payload = {
        ...result,
        reminder:
          'Studio may still need blogCategory, blogTags, authors, and images. Open the document in Sanity Studio after write.',
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

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const fileName = `${slug}.md`;
    const filePath = path.join(draftsFolderPath, fileName);

    try {
      await fs.mkdir(draftsFolderPath, { recursive: true });
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
