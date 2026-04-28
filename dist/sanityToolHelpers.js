import { createClient } from '@sanity/client';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
const API_VERSION = '2024-01-01';
/**
 * Sanity read helpers for MCP tools (`get_published_blogs`, taxonomy, samples, images).
 * Expects `.env` already loaded (`loadSanityBlogEnv()` in `index.ts` at bootstrap).
 */
export function requireSanityProjectId() {
    const projectId = process.env.SANITY_PROJECT_ID;
    if (!projectId) {
        throw new McpError(ErrorCode.InternalError, 'SANITY_PROJECT_ID is missing. Add tessell-blog-agent-mcp/.env (see .env.example) or export SANITY_* in the MCP process.');
    }
    return projectId;
}
export function sanityDataset() {
    return process.env.SANITY_DATASET || 'staging';
}
/** Shared read client + ids for JSON `meta` blocks in tool responses. */
export function createSanityReadClientWithMeta(options) {
    const projectId = requireSanityProjectId();
    const dataset = sanityDataset();
    const useCdn = options?.useCdn !== undefined ? options.useCdn : process.env.NODE_ENV === 'production';
    const perspective = options?.perspective ?? 'published';
    const token = process.env.SANITY_TOKEN?.trim() || process.env.SANITY_READ_TOKEN?.trim() || undefined;
    const client = createClient({
        projectId,
        dataset,
        apiVersion: API_VERSION,
        useCdn,
        perspective,
        token,
    });
    return { client, projectId, dataset };
}
