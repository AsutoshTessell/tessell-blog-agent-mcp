import { randomUUID } from 'crypto';
import { BLOG_CATEGORIES_QUERY, BLOG_TAGS_QUERY } from './blogTaxonomyQueries.js';
import { createSanityReadClientWithMeta } from './sanityToolHelpers.js';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Sanity blogCategory / blogTag ids are typically 24-char hex or UUID-shaped strings. */
export function looksLikeSanityDocumentId(s) {
    const t = s.trim();
    if (/^[a-f0-9]{24}$/i.test(t))
        return true;
    return UUID_RE.test(t);
}
function makeKey() {
    return randomUUID().replace(/-/g, '').slice(0, 12);
}
function normLabel(s) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
function slugifyLabel(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 256);
}
function pickString(data, ...keys) {
    for (const k of keys) {
        const v = data[k];
        if (typeof v === 'string' && v.trim())
            return v.trim();
    }
    return '';
}
/** YAML array of strings, or comma-separated string */
function parseRefList(val) {
    if (Array.isArray(val)) {
        return val
            .filter((x) => typeof x === 'string')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }
    if (typeof val === 'string' && val.trim()) {
        return val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
}
function matchTaxonomyRow(rows, label) {
    const n = normLabel(label);
    const slugFromLabel = slugifyLabel(label);
    const trimmed = label.trim();
    return rows.find((r) => {
        if (normLabel(r.name) === n)
            return true;
        if (r.slug && (r.slug === trimmed || r.slug === slugFromLabel))
            return true;
        return false;
    });
}
async function fetchTaxonomyRows() {
    const { client } = createSanityReadClientWithMeta({ useCdn: false });
    const [categories, tags] = await Promise.all([
        client.fetch(BLOG_CATEGORIES_QUERY),
        client.fetch(BLOG_TAGS_QUERY),
    ]);
    return {
        categories: Array.isArray(categories) ? categories : [],
        tags: Array.isArray(tags) ? tags : [],
    };
}
/**
 * Loads current blogCategory / blogTag documents from Sanity and fills `document.blogCategory`
 * and `document.blogTags` from frontmatter.
 *
 * Resolution order:
 * - **Category:** `blogCategoryRef` (if value looks like a document `_id`, use as-is; otherwise match by name/slug),
 *   then `category` / `blogCategoryName` (match by name or slug).
 * - **Tags:** each entry in `blogTagsRefs` and `tags` — if it looks like an `_id`, use as-is; otherwise match by name or slug.
 *
 * Does **not** use `TESSELL_DEFAULT_*` env vars — taxonomy always comes from a live Sanity fetch so IDs stay current.
 */
export async function resolveTaxonomyFromSanity(document, frontmatter) {
    const warnings = [];
    const { categories, tags } = await fetchTaxonomyRows();
    const catRefRaw = pickString(frontmatter, 'blogCategoryRef', 'blog_category_ref');
    const catLabel = pickString(frontmatter, 'category', 'blogCategoryName', 'blog_category');
    let catId;
    if (catRefRaw) {
        if (looksLikeSanityDocumentId(catRefRaw)) {
            catId = catRefRaw.trim();
        }
        else {
            const m = matchTaxonomyRow(categories, catRefRaw);
            if (m)
                catId = m._id;
            else {
                warnings.push(`blogCategoryRef "${catRefRaw}" did not match any category _id or name in Sanity (dataset refreshed on each conversion).`);
            }
        }
    }
    if (!catId && catLabel) {
        const m = matchTaxonomyRow(categories, catLabel);
        if (m)
            catId = m._id;
        else {
            warnings.push(`category "${catLabel}" did not match any blogCategory in Sanity. Call get_blog_categories_and_tags and use an exact name or slug from the response.`);
        }
    }
    if (catId) {
        document.blogCategory = { _type: 'reference', _ref: catId };
    }
    const tagIdsOrdered = [];
    const seen = new Set();
    const pushTagId = (id) => {
        if (!seen.has(id)) {
            seen.add(id);
            tagIdsOrdered.push(id);
        }
    };
    const blogTagsRefsList = parseRefList(frontmatter.blogTagsRefs ?? frontmatter.blog_tag_refs ?? frontmatter.blogTagIds ?? frontmatter.blog_tag_ids);
    const tagsHumanList = parseRefList(frontmatter.tags ?? frontmatter.tag);
    for (const raw of blogTagsRefsList) {
        if (looksLikeSanityDocumentId(raw)) {
            pushTagId(raw.trim());
        }
        else {
            const m = matchTaxonomyRow(tags, raw);
            if (m)
                pushTagId(m._id);
            else {
                warnings.push(`blogTagsRefs entry "${raw}" did not match any blogTag _id or name in Sanity.`);
            }
        }
    }
    for (const raw of tagsHumanList) {
        if (looksLikeSanityDocumentId(raw)) {
            pushTagId(raw.trim());
        }
        else {
            const m = matchTaxonomyRow(tags, raw);
            if (m)
                pushTagId(m._id);
            else {
                warnings.push(`tags entry "${raw}" did not match any blogTag in Sanity.`);
            }
        }
    }
    if (tagIdsOrdered.length) {
        document.blogTags = tagIdsOrdered.map((ref) => ({
            _type: 'reference',
            _ref: ref,
            _key: makeKey(),
        }));
    }
    return warnings;
}
