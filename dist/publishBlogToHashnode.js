import matter from 'gray-matter';
import { readFile } from 'fs/promises';
import { CREATE_DRAFT_MUTATION, PUBLISH_POST_MUTATION, PUBLICATION_BY_HOST_QUERY, hashnodeGraphqlRequest, } from './hashnodeGraphql.js';
function pickString(data, ...keys) {
    for (const k of keys) {
        const v = data[k];
        if (typeof v === 'string' && v.trim())
            return v.trim();
    }
    return '';
}
/** Hashnode GraphQL rejects subtitles longer than 250 characters. */
const HASHNODE_SUBTITLE_MAX = 250;
/**
 * Clips a subtitle to fit within HASHNODE_SUBTITLE_MAX characters with no ellipsis.
 * Strategy (in priority order):
 *  1. If the string already fits, return it as-is.
 *  2. Find the last sentence-ending punctuation (. ! ?) within the limit and cut there.
 *  3. Fall back to the last word boundary (space) within the limit.
 *  4. Hard-slice at the limit as a last resort.
 */
function clipForHashnodeSubtitle(s) {
    if (s.length <= HASHNODE_SUBTITLE_MAX)
        return s;
    const candidate = s.slice(0, HASHNODE_SUBTITLE_MAX);
    // Find the last sentence-ending punctuation within the candidate
    const sentenceEnd = candidate.search(/[.!?][^.!?]*$/);
    if (sentenceEnd > 0)
        return candidate.slice(0, sentenceEnd + 1);
    // Fall back: trim to last word boundary
    const lastSpace = candidate.lastIndexOf(' ');
    if (lastSpace > 0)
        return candidate.slice(0, lastSpace);
    return candidate;
}
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 96);
}
function normalizeTags(raw) {
    if (!raw)
        return [];
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        if (typeof item === 'string' && item.trim()) {
            const name = item.trim();
            out.push({ name, slug: slugify(name) });
        }
    }
    return out.slice(0, 10);
}
function buildCanonicalUrl(data, slug) {
    const explicit = pickString(data, 'canonicalUrl', 'canonicalURL', 'originalArticleURL', 'originalArticleUrl');
    if (explicit)
        return explicit;
    const base = process.env.TESSELL_BLOG_CANONICAL_BASE_URL?.trim().replace(/\/$/, '');
    if (base && slug)
        return `${base}/${slug}`;
    return undefined;
}
/** Public query — no PAT required. */
export async function fetchHashnodePublicationByHost(host) {
    return hashnodeGraphqlRequest(PUBLICATION_BY_HOST_QUERY, { host: host.trim() }, undefined);
}
/**
 * Resolve Hashnode `publicationId` from env or optional `publicationHost` (GraphQL query, no PAT required).
 */
export async function resolveHashnodePublicationId(publicationHost) {
    const fromEnv = process.env.HASHNODE_PUBLICATION_ID?.trim();
    if (fromEnv)
        return fromEnv;
    const host = publicationHost?.trim() || process.env.HASHNODE_PUBLICATION_HOST?.trim();
    if (!host)
        return undefined;
    const data = await fetchHashnodePublicationByHost(host);
    return data.publication?.id ?? undefined;
}
/**
 * Tool/explicit `mode` wins; otherwise **`HASHNODE_PUBLISH_MODE`** (`draft`|`publish`).
 * If unset, defaults to **`draft`** (Hashnode `createDraft` — review before live).
 */
export function resolveHashnodeMode(explicit) {
    const m = explicit?.trim().toLowerCase();
    if (m === 'publish')
        return 'publish';
    if (m === 'draft')
        return 'draft';
    const env = process.env.HASHNODE_PUBLISH_MODE?.trim().toLowerCase();
    if (env === 'publish')
        return 'publish';
    if (env === 'draft')
        return 'draft';
    return 'draft';
}
export async function publishMarkdownToHashnode(options) {
    const absPath = options.markdownFilePath.trim();
    const raw = await readFile(absPath, 'utf-8');
    const { data: fm, content } = matter(raw);
    const data = fm;
    const title = pickString(data, 'name', 'title');
    if (!title) {
        throw new Error('Markdown frontmatter must include `title` or `name`');
    }
    const subtitleRaw = pickString(data, 'postSummary', 'summary', 'subtitle');
    const subtitle = subtitleRaw ? clipForHashnodeSubtitle(subtitleRaw) : '';
    const slugRaw = pickString(data, 'slug');
    const slug = slugRaw || slugify(title);
    const contentMarkdown = content.trim();
    if (!contentMarkdown) {
        throw new Error('Markdown body is empty after frontmatter');
    }
    const tags = normalizeTags(data.tags);
    const originalArticleURL = buildCanonicalUrl(data, slug);
    const coverImageURL = pickString(data, 'coverImageURL', 'coverImageUrl', 'coverImage');
    const token = process.env.HASHNODE_ACCESS_TOKEN?.trim();
    let publicationId = process.env.HASHNODE_PUBLICATION_ID?.trim() ||
        (await resolveHashnodePublicationId(options.publicationHost));
    const inputSummary = {
        title,
        subtitle: subtitle || undefined,
        slug: slug || undefined,
        publicationId: publicationId || undefined,
        contentMarkdownChars: contentMarkdown.length,
        tagCount: tags.length,
        originalArticleURL,
        coverImageURL: coverImageURL || undefined,
    };
    if (options.dryRun || !token || !publicationId) {
        return {
            ok: true,
            dryRun: true,
            mode: options.mode,
            markdownFilePath: absPath,
            inputSummary,
            reminder: !token
                ? 'Set HASHNODE_ACCESS_TOKEN (Hashnode → Settings → Developer) to perform a real publish.'
                : !publicationId
                    ? 'Set HASHNODE_PUBLICATION_ID or HASHNODE_PUBLICATION_HOST (publication hostname) to perform a real publish.'
                    : 'dryRun: true — no request sent to Hashnode.',
        };
    }
    const baseInput = {
        publicationId,
        title,
        subtitle: subtitle || undefined,
        slug: slug || undefined,
        contentMarkdown,
        tags: tags.length ? tags : undefined,
        originalArticleURL: originalArticleURL || undefined,
        ...(coverImageURL ? { coverImageOptions: { coverImageURL } } : {}),
    };
    if (options.mode === 'draft') {
        const result = await hashnodeGraphqlRequest(CREATE_DRAFT_MUTATION, { input: baseInput }, token);
        return {
            ok: true,
            dryRun: false,
            mode: 'draft',
            markdownFilePath: absPath,
            inputSummary,
            hashnode: { draft: result.createDraft.draft },
            reminder: 'Draft created on Hashnode — open Hashnode dashboard to review and publish.',
        };
    }
    const result = await hashnodeGraphqlRequest(PUBLISH_POST_MUTATION, { input: baseInput }, token);
    return {
        ok: true,
        dryRun: false,
        mode: 'publish',
        markdownFilePath: absPath,
        inputSummary,
        hashnode: { post: result.publishPost.post },
        reminder: 'Post published on Hashnode. If this is syndication, ensure `canonicalUrl` / originalArticleURL points at your Tessell blog.',
    };
}
