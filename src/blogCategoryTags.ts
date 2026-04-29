import { randomUUID } from 'crypto';
import type { ApiReadyBlogDocument } from './markdownToSanityBlog.js';
import { looksLikeSanityDocumentId } from './blogTaxonomyResolve.js';

function makeKey(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

function pickString(data: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** YAML array of strings, or comma-separated string */
function parseRefList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .filter((x): x is string => typeof x === 'string')
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

/**
 * Applies only explicit `_ref` strings from frontmatter (no Sanity fetch, no `.env` defaults).
 * Used for legacy JSON payload flows. Markdown conversion uses `resolveTaxonomyFromSanity` instead.
 */
export function mergeBlogCategoryAndTags(
  document: ApiReadyBlogDocument,
  frontmatter: Record<string, unknown> | null | undefined
): void {
  const data = frontmatter || {};

  if (!document.blogCategory) {
    const cat = pickString(data, 'blogCategoryRef', 'blog_category_ref');
    if (cat && looksLikeSanityDocumentId(cat)) {
      document.blogCategory = { _type: 'reference', _ref: cat.trim() };
    }
  }

  if (!document.blogTags?.length) {
    const rawList = parseRefList(data.blogTagsRefs ?? data.blog_tag_refs ?? data.blogTagIds ?? data.blog_tag_ids);
    const idOnly = rawList.filter((r) => looksLikeSanityDocumentId(r));
    if (idOnly.length) {
      document.blogTags = idOnly.map((ref) => ({
        _type: 'reference' as const,
        _ref: ref.trim(),
        _key: makeKey(),
      }));
    }
  }
}
