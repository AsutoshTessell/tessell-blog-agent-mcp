#!/usr/bin/env node
import { createClient } from '@sanity/client';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { BLOG_POSTS_QUERY } from './blogQueries.js';
import { loadTessellWebsiteEnv } from './loadEnv.js';
const execAsync = promisify(exec);
/** Load tessell-website/.env before reading tools (same SANITY_* as Next.js). */
loadTessellWebsiteEnv();
const server = new Server({
    name: 'tessell-blog-agent',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
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
                description: 'Lists blog posts using the same Sanity query as localhost:3000/blog (BLOG_POSTS_QUERY). Loads `.env` in this repo first (copy from `.env.example`), then optional TESSELL_WEBSITE_* paths, then sibling tessell-web/tessell-website/.env. Uses @sanity/client.',
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
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'read_tessell_ui_features') {
        const { repoPath, daysBack = 14 } = request.params.arguments;
        try {
            const { stdout } = await execAsync(`git log --since="${daysBack} days ago" --oneline`, {
                cwd: repoPath,
            });
            return {
                content: [{ type: 'text', text: stdout }],
            };
        }
        catch (e) {
            throw new McpError(ErrorCode.InternalError, `Failed to read git log: ${e.message}`);
        }
    }
    if (request.params.name === 'get_published_blogs') {
        try {
            loadTessellWebsiteEnv();
            const projectId = process.env.SANITY_PROJECT_ID;
            if (!projectId) {
                throw new McpError(ErrorCode.InternalError, 'SANITY_PROJECT_ID is missing. Add tessell-blog-agent-mcp/.env (see .env.example), or point TESSELL_WEBSITE_ENV_PATH at tessell-website/.env, or export SANITY_* in the MCP process.');
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
        }
        catch (e) {
            if (e instanceof McpError)
                throw e;
            throw new McpError(ErrorCode.InternalError, `Sanity fetch failed: ${e.message}`);
        }
    }
    if (request.params.name === 'save_blog_draft') {
        const { title, markdownContent, draftsFolderPath } = request.params.arguments;
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
        }
        catch (e) {
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
