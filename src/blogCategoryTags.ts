import { randomUUID } from 'crypto';
import type { ApiReadyBlogDocument } from './markdownToSanityBlog.js';

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
 * Merges `blogCategory` and `blogTags` (Sanity references) into the document.
 * Frontmatter wins; env defaults fill only missing pieces.
 * Schema: blogCategory → reference `blogCategory`; blogTags → array of references `blogTag`.
 */
export function mergeBlogCategoryAndTags(
  document: ApiReadyBlogDocument,
  frontmatter: Record<string, unknown> | null | undefined
): void {
  const data = frontmatter || {};

  if (!document.blogCategory) {
    const cat =
      pickString(data, 'blogCategoryRef', 'blog_category_ref') ||
      process.env.TESSELL_DEFAULT_BLOG_CATEGORY_REF?.trim();
    if (cat) {
      document.blogCategory = { _type: 'reference', _ref: cat };
    }
  }

  if (!document.blogTags?.length) {
    let tags = parseRefList(data.blogTagsRefs ?? data.blog_tag_refs ?? data.blogTagIds ?? data.blog_tag_ids);
    if (!tags.length && process.env.TESSELL_DEFAULT_BLOG_TAG_REFS?.trim()) {
      tags = parseRefList(process.env.TESSELL_DEFAULT_BLOG_TAG_REFS);
    }
    if (tags.length) {
      document.blogTags = tags.map((ref) => ({
        _type: 'reference' as const,
        _ref: ref,
        _key: makeKey(),
      }));
    }
  }
}
