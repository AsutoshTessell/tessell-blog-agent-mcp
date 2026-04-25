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
import { BLOG_CATEGORIES_QUERY, BLOG_TAGS_QUERY } from './blogTaxonomyQueries.js';
import { BLOG_IMAGE_EXAMPLES_QUERY } from './blogImageExamplesQuery.js';
import { loadTessellWebsiteEnv } from './loadEnv.js';
import { markdownToSanityBlogPayloads } from './markdownToSanityBlog.js';
import { publishBlogPostToSanity, resolveBlogPostDocument } from './publishBlogToSanity.js';
import { BLOG_STYLE_GUIDE, PREFERRED_SAMPLE_SLUGS, BLOG_SAMPLE_PREFERRED_QUERY, BLOG_SAMPLE_FALLBACK_QUERY, } from './blogStyleGuide.js';
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
                description: 'Scans the git history of the tessell-ui repository to find recent feature commits. Returns commit messages with short descriptions. Use the output alongside get_blog_style_guide to decide what merits a blog post, what to skip, and whether to create one post or multiple.',
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
                description: 'Lists all published blog posts (title, slug, summary, category). Use this to: (1) avoid duplicating existing content, (2) analyze which categories and topics are well-covered vs underserved, (3) understand what Tessell considers blog-worthy, (4) decide whether your new content fits an existing post\'s topic or needs a fresh angle. Study titles and summaries to match the naming style.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_blog_categories_and_tags',
                description: 'Fetches existing blogCategory and blogTag documents from Sanity (GROQ: _id, name, slug). Excludes archived and draft taxonomy rows. Same env as get_published_blogs. Use _id values in frontmatter blogCategoryRef / blogTagsRefs or TESSELL_DEFAULT_* in .env.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_blog_image_asset_examples',
                description: 'Returns up to 15 recent blog posts that have a thumbnailImage, with thumbnailAssetRef and mainAssetRef (Sanity image asset _ref strings). Reuse refs in draft frontmatter as thumbnailImageAssetRef / mainImageAssetRef so blog cards show an image, or upload new assets in Studio.',
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
                description: 'Converts Markdown + frontmatter to apiReady blogPost JSON. blogCategory/blogTags required; optional thumbnailImageAssetRef / mainImageAssetRef for grid + hero images (Sanity image asset _refs; see get_blog_image_asset_examples). .env defaults supported. Authors not set here.',
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
                description: 'Writes a blog post to Sanity using createOrReplace (mutations API). Requires SANITY_TOKEN with write access. Optional generateCardImageFromContent (or env TESSELL_AUTO_GENERATE_BLOG_CARD_IMAGE): renders title+summary as PNG, uploads asset, sets thumbnail+main image if missing. Same sources as markdown_to_sanity_blog; env fills category/tags/images defaults. dryRun skips uploads.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        markdownFilePath: {
                            type: 'string',
                            description: 'Absolute path to a .md draft; document is built from Markdown + frontmatter.',
                        },
                        sanityPayloadsJsonPath: {
                            type: 'string',
                            description: 'Absolute path to a JSON file containing { apiReady: { document } } (e.g. *.sanity-payloads.json).',
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
                            description: 'If true, generates a branded PNG from post title + postSummary and uploads to Sanity when no thumbnailImage yet (requires write token + asset permissions).',
                        },
                    },
                },
            },
            {
                name: 'get_blog_style_guide',
                description: 'Returns the Tessell blog writing style guide AND content strategy. Covers: tone, structure, title patterns, engagement techniques, anti-patterns, PLUS — how to decide one post vs multiple, what deserves a blog vs what doesn\'t, the "What → Why → How It Helps" section pattern for each feature, audience understanding, how to learn from published blog patterns, AND the secondary "Platform Update" post strategy for skipped items (so marketing has visibility into all changes). Call this BEFORE writing any draft.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_published_blog_samples',
                description: 'Fetches well-written published blog posts with FULL body text from Sanity. Study them to learn: how sections are structured (What → Why → How), how subheadings tell a story, how each feature is explained with context and business impact, how openings hook readers, and how closings deliver a takeaway. Write your draft to match this quality. Also use these to judge what level of content Tessell publishes — if the changes you have don\'t meet this bar, consolidate or skip.',
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
    if (request.params.name === 'get_blog_categories_and_tags') {
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
        }
        catch (e) {
            if (e instanceof McpError)
                throw e;
            throw new McpError(ErrorCode.InternalError, `Sanity taxonomy fetch failed: ${e.message}`);
        }
    }
    if (request.params.name === 'get_blog_image_asset_examples') {
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
                useCdn: process.env.NODE_ENV === 'production',
                perspective: 'published',
                token: process.env.SANITY_TOKEN || process.env.SANITY_READ_TOKEN || undefined,
            });
            const examples = await client.fetch(BLOG_IMAGE_EXAMPLES_QUERY);
            const meta = {
                sanityProjectId: projectId,
                sanityDataset: dataset,
                count: Array.isArray(examples) ? examples.length : 0,
                hint: 'Use thumbnailAssetRef (or mainAssetRef) in markdown frontmatter as thumbnailImageAssetRef / mainImageAssetRef — they must be existing image asset _refs in this dataset.',
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ meta, examples }, null, 2),
                    },
                ],
            };
        }
        catch (e) {
            if (e instanceof McpError)
                throw e;
            throw new McpError(ErrorCode.InternalError, `Sanity image examples fetch failed: ${e.message}`);
        }
    }
    if (request.params.name === 'markdown_to_sanity_blog') {
        const args = (request.params.arguments || {});
        if (!args.markdown?.trim() && !args.markdownFilePath?.trim()) {
            throw new McpError(ErrorCode.InvalidParams, 'Provide either markdown (string) or markdownFilePath (absolute path to .md).');
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
        }
        catch (e) {
            throw new McpError(ErrorCode.InternalError, e.message || String(e));
        }
    }
    if (request.params.name === 'publish_blog_to_sanity') {
        const args = (request.params.arguments || {});
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
        }
        catch (e) {
            throw new McpError(ErrorCode.InternalError, e.message || String(e));
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
    if (request.params.name === 'get_blog_style_guide') {
        return {
            content: [{ type: 'text', text: BLOG_STYLE_GUIDE }],
        };
    }
    if (request.params.name === 'get_published_blog_samples') {
        try {
            loadTessellWebsiteEnv();
            const projectId = process.env.SANITY_PROJECT_ID;
            if (!projectId) {
                throw new McpError(ErrorCode.InternalError, 'SANITY_PROJECT_ID is missing.');
            }
            const dataset = process.env.SANITY_DATASET || 'staging';
            const count = Math.min(request.params.arguments?.count || 3, 5);
            const client = createClient({
                projectId,
                dataset,
                apiVersion: '2024-01-01',
                useCdn: false,
                perspective: 'published',
                token: process.env.SANITY_TOKEN || process.env.SANITY_READ_TOKEN || undefined,
            });
            let samples = await client.fetch(BLOG_SAMPLE_PREFERRED_QUERY, {
                slugs: PREFERRED_SAMPLE_SLUGS,
            });
            if (!samples?.length) {
                const fallback = BLOG_SAMPLE_FALLBACK_QUERY.replace('[0...3]', `[0...${count}]`);
                samples = await client.fetch(fallback);
            }
            else if (samples.length > count) {
                samples = samples.slice(0, count);
            }
            const formatted = samples.map((p) => ({
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
                        text: JSON.stringify({
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
                        }, null, 2),
                    },
                ],
            };
        }
        catch (e) {
            if (e instanceof McpError)
                throw e;
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
