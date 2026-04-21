import matter from 'gray-matter';
import { randomUUID } from 'crypto';
import { markdownToPortableTextBlocks } from './mdToPortableText.js';
import { mergeBlogCategoryAndTags } from './blogCategoryTags.js';
function slugify(input) {
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
    if (!seoMeta)
        seoMeta = pickString(data, 'seoMetaDescription', 'seo_meta_description', 'metaDescription');
    const publishedDate = pickString(data, 'publishedDate', 'published_date', 'date');
    /** Omitted → treat as draft so API/Studio posts are not live until `draft: false` is set explicitly. */
    const draft = data.draft === undefined ? true : Boolean(data.draft);
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
            'Set `blogCategoryRef` + `blogTagsRefs` in frontmatter (or TESSELL_DEFAULT_BLOG_CATEGORY_REF / TESSELL_DEFAULT_BLOG_TAG_REFS in .env) — values are Sanity document `_id`s for blogCategory / blogTag.',
            'Author and images (mainImage, thumbnailImage) are still set in Studio or extend the tool.',
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
            _id: randomUUID(),
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
        mergeBlogCategoryAndTags(document, data);
        if (!document.blogCategory) {
            warnings.push('Missing blogCategory: set `blogCategoryRef` in frontmatter or TESSELL_DEFAULT_BLOG_CATEGORY_REF in .env (Sanity `_id` of a blogCategory document).');
        }
        if (!document.blogTags?.length) {
            warnings.push('Missing blogTags: set `blogTagsRefs` in frontmatter (array or comma-separated) or TESSELL_DEFAULT_BLOG_TAG_REFS in .env (one or more blogTag `_id`s).');
        }
        const catRef = document.blogCategory?._ref;
        const tagsStr = document.blogTags?.map((t) => t._ref).join(', ') || '';
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
