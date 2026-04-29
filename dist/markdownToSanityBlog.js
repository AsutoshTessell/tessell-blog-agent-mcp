import matter from 'gray-matter';
import { randomUUID } from 'crypto';
import { markdownToPortableTextBlocks } from './mdToPortableText.js';
import { loadSanityBlogEnv } from './loadEnv.js';
import { resolveTaxonomyFromSanity } from './blogTaxonomyResolve.js';
import { mergeBlogImages } from './blogImageFields.js';
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 256);
}
/** UUID v4 pattern — used when frontmatter supplies an existing Sanity document id for createOrReplace. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function pickOptionalDocumentId(data) {
    const raw = pickString(data, 'sanityDocumentId', 'documentId', '_id');
    if (!raw)
        return undefined;
    return UUID_RE.test(raw) ? raw : undefined;
}
function pickString(data, ...keys) {
    for (const k of keys) {
        const v = data[k];
        if (typeof v === 'string' && v.trim())
            return v.trim();
    }
    return '';
}
function normalizeFrontmatter(data) {
    const title = pickString(data, 'name', 'title');
    const slugRaw = pickString(data, 'slug');
    const slug = slugRaw || (title ? slugify(title) : '');
    const postSummary = pickString(data, 'postSummary', 'summary');
    const description = pickString(data, 'description');
    let seoTitle = '';
    let seoMeta = '';
    const seo = data.seo;
    if (seo && typeof seo === 'object' && seo !== null && !Array.isArray(seo)) {
        const s = seo;
        seoTitle = pickString(s, 'title');
        seoMeta = pickString(s, 'metaDescription');
    }
    if (!seoTitle)
        seoTitle = pickString(data, 'seoTitle', 'seo_title');
    if (!seoMeta) {
        seoMeta = pickString(data, 'seoMetaDescription', 'seo_meta_description', 'seoDescription', 'metaDescription');
    }
    const publishedDate = pickString(data, 'publishedDate', 'published_date', 'date');
    /** MCP policy: generated/converted posts are always created as drafts. */
    const draft = true;
    const archived = Boolean(data.archived);
    const headerFeatured = Boolean(data.headerFeatured);
    const featured = Boolean(data.featured);
    return {
        title,
        slug,
        postSummary,
        description,
        seoTitle,
        seoMeta,
        publishedDate,
        draft,
        archived,
        headerFeatured,
        featured,
    };
}
export function markdownToSanityBlogPayloads(source) {
    return (async () => {
        const warnings = [];
        const notes = [
            'Category and tags: each `markdown_to_sanity_blog` run fetches the latest `blogCategory` / `blogTag` documents from Sanity. Use `category` + `tags` (human names) and/or `blogCategoryRef` + `blogTagsRefs` (document `_id`s or names) in frontmatter — see README and Cursor rules.',
            'Optional: `sanityDocumentId` (blogPost UUID) to update an existing document on republish instead of creating a new one.',
            'Optional images: `thumbnailImageAssetRef` + `mainImageAssetRef` (Sanity **image asset** `_ref` from CDNs). Use MCP `get_blog_image_asset_examples` to copy refs from existing posts, or upload in Studio.',
            'Authors: add in Studio unless you extend the tool.',
        ];
        let raw = source.markdown;
        if (source.markdownFilePath) {
            const { readFile } = await import('fs/promises');
            raw = await readFile(source.markdownFilePath, 'utf-8');
        }
        if (raw === undefined || raw === '') {
            throw new Error('Provide markdown or markdownFilePath');
        }
        const { data: fm, content: body } = matter(raw);
        const data = (fm || {});
        const meta = normalizeFrontmatter(data);
        if (!meta.title) {
            warnings.push('Missing frontmatter `title` or `name`; set before publishing.');
        }
        if (!meta.slug) {
            warnings.push('Missing `slug`; slug was derived empty — set in frontmatter.');
        }
        if (!meta.seoMeta) {
            warnings.push('Missing SEO meta description (`seo.metaDescription` in frontmatter or `seoMetaDescription`).');
        }
        const postBody = markdownToPortableTextBlocks(body);
        const name = meta.title || 'Untitled';
        const slugCurrent = meta.slug || slugify(name);
        const document = {
            _type: 'blogPost',
            _id: pickOptionalDocumentId(data) ?? randomUUID(),
            name,
            slug: { _type: 'slug', current: slugCurrent },
            postBody,
        };
        if (meta.postSummary)
            document.postSummary = meta.postSummary;
        if (meta.description)
            document.description = meta.description;
        if (meta.seoTitle || meta.seoMeta) {
            document.seo = {};
            if (meta.seoTitle)
                document.seo.title = meta.seoTitle;
            if (meta.seoMeta)
                document.seo.metaDescription = meta.seoMeta;
        }
        if (meta.publishedDate)
            document.publishedDate = meta.publishedDate;
        document.draft = meta.draft;
        document.archived = meta.archived;
        document.headerFeatured = meta.headerFeatured;
        document.featured = meta.featured;
        loadSanityBlogEnv();
        try {
            const taxonomyWarnings = await resolveTaxonomyFromSanity(document, data);
            warnings.push(...taxonomyWarnings);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            warnings.push(`Taxonomy (category/tags) could not be loaded from Sanity: ${msg}`);
        }
        mergeBlogImages(document, data);
        if (!document.blogCategory) {
            warnings.push('Missing blogCategory: set `category` (name) or `blogCategoryRef` in frontmatter. Names are matched against the latest categories from Sanity (see get_blog_categories_and_tags).');
        }
        if (!document.blogTags?.length) {
            warnings.push('Missing blogTags: set `tags` (names) and/or `blogTagsRefs` in frontmatter. Names are matched against the latest tags from Sanity.');
        }
        if (!document.thumbnailImage?.asset?._ref) {
            warnings.push('No thumbnail image: blog cards use `thumbnailImage`. Set `thumbnailImageAssetRef` / `mainImageAssetRef` in frontmatter, env defaults, or use get_blog_image_asset_examples + Studio upload.');
        }
        const catRef = document.blogCategory?._ref;
        const tagsStr = document.blogTags?.map((t) => t._ref).join(', ') || '';
        const thumbRef = document.thumbnailImage?.asset?._ref;
        const mainRefDoc = document.mainImage?.asset?._ref;
        const studioFriendly = {
            blogPostTitle: name,
            slug: slugCurrent,
            postSummary: meta.postSummary,
            description: meta.description,
            seoTitle: meta.seoTitle,
            seoMetaDescription: meta.seoMeta,
            postBody_markdown: body.trim(),
            publishedDate: meta.publishedDate,
            draft: meta.draft,
            archived: meta.archived,
            headerFeatured: meta.headerFeatured,
            featured: meta.featured,
            blogCategoryRef: catRef,
            blogTagsRefs: tagsStr,
            thumbnailImageAssetRef: thumbRef,
            mainImageAssetRef: mainRefDoc,
        };
        const mutationHint = 'POST { "mutations": [ { "createOrReplace": <apiReady.document> } ] } to https://<projectId>.api.sanity.io/v2024-01-01/data/mutate/<dataset> with Authorization: Bearer <SANITY_TOKEN>. Or use @sanity/client createOrReplace.';
        return {
            apiReady: { document, mutationHint },
            studioFriendly,
            warnings,
            notes,
        };
    })();
}
