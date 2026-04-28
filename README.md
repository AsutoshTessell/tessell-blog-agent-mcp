# Tessell blog agent MCP

This MCP walks through a simple loop:

1. **See what is already published** — pull the live blog list from Sanity so you do not repeat a topic.  
2. **See what is new in the UI** — point it at your local **tessell-ui** repo and it reads **recent git commits** (by date range), not a full file-by-file diff.  
3. **Write a post** — save a Markdown draft on disk.  
4. **Turn it into CMS shape** — build the `blogPost` JSON (Portable Text body, fields from frontmatter).  
5. **Publish to Sanity** (optional) — send that document into your dataset (staging by default, usually as a draft).

**→ Full step-by-step + copy-paste prompt:** [BLOG_AGENT_WORKFLOW.md](./BLOG_AGENT_WORKFLOW.md)

---

## What it does (the arc)

| Phase | Idea |
|--------|------|
| **Avoid duplicates** | “What did we already blog?” → fetch published posts from Sanity (same query as the site). |
| **Discover** | “What changed in tessell-ui lately?” → `git log` for the last *N* days (you choose the repo path and window). |
| **Draft** | Save Markdown (+ YAML frontmatter) under **`tessell-blog-agent-mcp/drafts/`** by default (`save_blog_draft`). |
| **Convert** | Markdown → Portable Text `blogPost` + Studio-friendly strings. |
| **Publish** | Optional `createOrReplace` into Sanity (**staging** by default, **draft** by default). |

---

## Setup

1. **Build:** `npm install` then `npm run build`
2. **Env:** copy `.env.example` → `.env` and set at least `SANITY_PROJECT_ID` (and usually `SANITY_DATASET`, `SANITY_TOKEN` for reads + writes). The CMS **requires** a `blogCategory` and at least one `blogTag` on each post: set **`TESSELL_DEFAULT_BLOG_CATEGORY_REF`** and **`TESSELL_DEFAULT_BLOG_TAG_REFS`** (comma-separated tag `_id`s), **or** put **`blogCategoryRef`** / **`blogTagsRefs`** in each draft’s YAML (see below). Use Vision / Studio to copy document `_id`s (e.g. `*[_type == "blogCategory"]{_id,name}`).
3. **Cursor / MCP:** point your MCP config at `node /path/to/tessell-blog-agent-mcp/dist/index.js` (or your wrapper).

---

## Tools (quick reference)

### `read_tessell_ui_features`

**Input:** `repoPath` (absolute path to your local tessell-ui clone), optional `daysBack` (default **14**).  
**Does:** runs **`git log --since="<N> days ago" --oneline`** in that folder — a **list of recent commits**, not `git diff`. Use it to spot feature and fix messages for a “what’s new” post.  
**Why:** you control which clone and how far back to look; nothing is inferred automatically.

### `get_published_blogs`

**Input:** none.  
**Does:** loads `.env` / `.env.local` from this MCP repo, then **`@sanity/client.fetch(BLOG_POSTS_QUERY)`** — the **published** blog list your site would show, so you can compare before writing.  
**Why:** answers “do we already have a post on this?” before you draft.

### `get_blog_categories_and_tags`

**Input:** none.  
**Does:** two GROQ queries — all **`blogCategory`** and **`blogTag`** docs that are not archived and not draft, returning **`_id`**, **`name`**, **`slug`** for each. Same client/env as **`get_published_blogs`**.  
**Why:** pick **`_id`s** for **`blogCategoryRef`**, **`blogTagsRefs`**, or **`.env` defaults** without opening Vision manually.

### `get_blog_image_asset_examples`

**Input:** none.  
**Does:** recent **`blogPost`** rows that already have **`thumbnailImage`**, returning **`thumbnailAssetRef`** and **`mainAssetRef`** (Sanity **image asset** `_ref` strings you can reuse).  
**Why:** the Next.js blog **grid** uses **`thumbnailImage`**; the **article hero** uses **`mainImage`**. Without them you get gray placeholders. Paste refs into frontmatter **`thumbnailImageAssetRef`** / **`mainImageAssetRef`**, or set **`TESSELL_DEFAULT_*`** in `.env`, or upload new files in Studio.

### `save_blog_draft`

**Input:** `title`, `markdownContent`, optional `draftsFolderPath`.  
**Does:** slugifies the title and writes `something.md`. **Default folder:** `<tessell-blog-agent-mcp>/drafts` (keeps generated drafts next to this tool). Override with **`draftsFolderPath`**, or set **`TESSELL_BLOG_DRAFTS_DIR`** in `.env`.  
**Why:** one-shot file drop; you can also create files by hand with a dated name (see [BLOG_AGENT_WORKFLOW.md](./BLOG_AGENT_WORKFLOW.md)).

### `markdown_to_sanity_blog`

**Input:** `markdownFilePath` **or** raw `markdown` string.  
**Does:** `gray-matter` for frontmatter; body → Portable Text via `marked`; builds `apiReady.document` (`blogPost`) + `studioFriendly` flat fields.  
**Category & tags (required by schema):** frontmatter keys **`blogCategoryRef`** (one Sanity `_id`) and **`blogTagsRefs`** (YAML array of `_id`s, or one comma-separated string). If omitted, **`TESSELL_DEFAULT_*`** from `.env` is applied when set. These become **`blogCategory`** and **`blogTags`** reference fields on the payload.  
**Images:** optional **`thumbnailImageAssetRef`** / **`mainImageAssetRef`** (Sanity **image asset** `_ref`s). Listing cards need **`thumbnailImage`**; article hero uses **`mainImage`**. Use MCP **`get_blog_image_asset_examples`** to copy refs from posts that already have art, or env **`TESSELL_DEFAULT_THUMBNAIL_IMAGE_ASSET_REF`** / **`TESSELL_DEFAULT_MAIN_IMAGE_ASSET_REF`**. If only one ref is set, it is reused for both fields.  
**Authors:** still added in Studio unless you extend the tool.  
**Draft default:** if frontmatter omits `draft`, the document gets **`draft: true`** so API pushes don’t accidentally look “live.”

### `publish_blog_to_sanity`

**Input:** exactly one of `markdownFilePath`, `sanityPayloadsJsonPath` (saved JSON from the step above), or `documentJson`. Optional `dryRun`, optional `dataset` override, optional **`generateCardImageFromContent`**.  
**Does:** resolves a `blogPost` document (re-applies **default category/tags/images from `.env`** when loading saved JSON), optionally **generates a PNG** from **title + postSummary** (simple “Tessell” gradient card), **uploads** it as a Sanity image asset, and sets **thumbnail + main** when no thumbnail exists, then **`mutate([{ createOrReplace }])`**. This is **not** AI artwork—just readable typography for cards until design uploads real art in Studio.  
**Dry-run:** no token required; validates resolution and reports target project/dataset/slug. **Real write** needs a **write-capable** `SANITY_TOKEN` (with permission to upload assets).  
**Dataset:** defaults to `SANITY_DATASET` or **`staging`**.

---

## Mental model

- **MCP does not host tessell-ui**—it shells out **git** where you point it.
- **Sanity** uses `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_TOKEN` from this repo’s `.env` (or exported in the MCP process). Keep datasets straight (**staging** vs **prod**).
- **One document per successful publish** from Markdown: each conversion can mint a new `_id`; re-posting the same `.md` without pinning an id creates **another** document—edit in Studio or reuse a fixed `_id` in the payload if you need updates.

---

## License / ownership

Internal Tessell tooling; align usage with your team’s Sanity and repo policies.
