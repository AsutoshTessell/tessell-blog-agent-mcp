#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
const execAsync = promisify(exec);
/** Match tessell-web/tessell-website/sanity/lib/client.tsx */
const SANITY_API_VERSION = '2024-01-01';
function getSanityConfig() {
    const projectId = process.env.SANITY_PROJECT_ID ?? 'krotrzct';
    const dataset = process.env.SANITY_DATASET || 'staging';
    return { projectId, dataset };
}
/**
 * Same filter + order as tessell-web BLOG_POSTS_QUERY (listing page).
 * Projected fields kept minimal for the MCP tool payload.
 */
const BLOG_LIST_GROQ = `*[_type == "blogPost" && archived != true && draft != true] | order(featured desc, publishedDate desc) { _id, name, "slug": slug.current, postSummary, publishedDate }`;
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
                description: 'Lists published blog posts from Sanity using the same project/dataset as tessell-web (env: SANITY_PROJECT_ID, SANITY_DATASET default staging) and the same filters as the website blog listing (non-draft, non-archived, perspective published).',
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
                        }
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
        const { projectId, dataset } = getSanityConfig();
        const params = new URLSearchParams({
            query: BLOG_LIST_GROQ,
            perspective: 'published',
        });
        const url = `https://${projectId}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${dataset}?${params.toString()}`;
        return new Promise((resolve, reject) => {
            https
                .get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                        reject(new McpError(ErrorCode.InternalError, `Sanity HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const meta = { sanityProjectId: projectId, sanityDataset: dataset };
                        resolve({
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({ meta, result: parsed.result }, null, 2),
                                },
                            ],
                        });
                    }
                    catch (e) {
                        reject(new McpError(ErrorCode.InternalError, `Failed to parse Sanity response: ${e.message}`));
                    }
                });
            })
                .on('error', (e) => {
                reject(new McpError(ErrorCode.InternalError, `Failed to fetch from Sanity: ${e.message}`));
            });
        });
    }
    if (request.params.name === 'save_blog_draft') {
        const { title, markdownContent, draftsFolderPath } = request.params.arguments;
        // Create a safe slug for the filename
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
