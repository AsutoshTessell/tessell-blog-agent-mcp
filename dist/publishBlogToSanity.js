import { createClient } from '@sanity/client';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { markdownToSanityBlogPayloads } from './markdownToSanityBlog.js';
function isBlogPostDoc(x) {
    return (typeof x === 'object' &&
        x !== null &&
        x._type === 'blogPost' &&
        typeof x.name === 'string');
}
/**
 * Resolve a single `blogPost` document from one of: markdown file, saved payloads JSON, or raw JSON string.
 */
export async function resolveBlogPostDocument(source) {
    const md = source.markdownFilePath?.trim();
    const payloads = source.sanityPayloadsJsonPath?.trim();
    const rawJson = source.documentJson?.trim();
    const provided = [md, payloads, rawJson].filter(Boolean).length;
    if (provided !== 1) {
        throw new Error('Provide exactly one of: markdownFilePath, sanityPayloadsJsonPath, or documentJson');
    }
    if (md) {
        const { apiReady } = await markdownToSanityBlogPayloads({ markdownFilePath: md });
        return apiReady.document;
    }
    if (payloads) {
        const text = await readFile(payloads, 'utf-8');
        const parsed = JSON.parse(text);
        const fromApiReady = parsed.apiReady;
        if (fromApiReady?.document && isBlogPostDoc(fromApiReady.document)) {
            return fromApiReady.document;
        }
        if (isBlogPostDoc(parsed)) {
            return parsed;
        }
        throw new Error('sanityPayloadsJsonPath: expected `apiReady.document` with _type blogPost, or a root blogPost document');
    }
    const doc = JSON.parse(rawJson);
    if (!isBlogPostDoc(doc)) {
        throw new Error('documentJson must parse to an object with _type "blogPost" and a string name');
    }
    return doc;
}
/**
 * Writes a blog post document to Sanity via `createOrReplace` (mutations API).
 * Requires `SANITY_TOKEN` with write access (Editor token or similar).
 */
export async function publishBlogPostToSanity(document, options) {
    const projectId = process.env.SANITY_PROJECT_ID;
    const dataset = options?.dataset ?? process.env.SANITY_DATASET ?? 'staging';
    const token = process.env.SANITY_TOKEN;
    if (!projectId) {
        throw new Error('SANITY_PROJECT_ID is missing (load .env or set env).');
    }
    const slugCurrent = document.slug && typeof document.slug === 'object' && 'current' in document.slug
        ? document.slug.current
        : undefined;
    const documentId = document._id ?? '(missing _id)';
    if (options?.dryRun) {
        return {
            ok: true,
            dryRun: true,
            projectId,
            dataset,
            documentId: String(documentId),
            slug: slugCurrent,
        };
    }
    if (!token) {
        throw new Error('SANITY_TOKEN is required for mutations. Use a write-capable token (not read-only). See .env.example.');
    }
    const client = createClient({
        projectId,
        dataset,
        apiVersion: '2024-01-01',
        useCdn: false,
        token,
    });
    const docWithId = { ...document, _id: document._id ?? randomUUID() };
    const sanityResponse = await client.mutate([{ createOrReplace: docWithId }]);
    return {
        ok: true,
        dryRun: false,
        projectId,
        dataset,
        documentId: String(document._id ?? ''),
        slug: slugCurrent,
        sanityResponse,
    };
}
