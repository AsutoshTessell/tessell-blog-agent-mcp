# Tessell blog agent MCP

This MCP walks through a simple loop:

1. **See what is already published** — pull the live blog list from Sanity so you do not repeat a topic.  
2. **See what is new in the UI** — point it at your local **tessell-ui** repo and it reads **recent git commits** (by date range), not a full file-by-file diff.  
3. **Write a post** — use **`get_blog_style_guide`** (includes how to use merge **bodies** from `read_tessell_ui_features` for depth) and save a Markdown draft on disk.  
4. **Turn it into CMS shape** — build the `blogPost` JSON (Portable Text body, fields from frontmatter).  
5. **Publish to Sanity** (optional) — send that document into your dataset (staging by default, usually as a draft).  
6. **Publish to Hashnode** (optional) — same Markdown file via Hashnode GraphQL (`publish_blog_to_hashnode`); see **Hashnode** below.

**→ Full step-by-step + copy-paste prompt:** [BLOG_AGENT_WORKFLOW.md](./BLOG_AGENT_WORKFLOW.md)

---

## What it does (the arc)

| Phase | Idea |
|--------|------|
| **Avoid duplicates** | “What did we already blog?” → fetch published posts from Sanity (same query as the site). |
| **Discover** | “What changed in tessell-ui lately?” → `git log` for the last *N* days with **full commit messages** (or `onelineOnly` for a short list) — not `git diff`. |
| **Draft** | Turn merge **titles + bodies** into reader-facing posts — **`get_blog_style_guide`** explains using that PR-style text as source material. Save Markdown under **`drafts/`** (`save_blog_draft`). |
| **Convert** | Markdown → Portable Text `blogPost` + Studio-friendly strings. |
| **Publish** | Optional `createOrReplace` into Sanity (**staging** by default, **draft** by default). Optional second hop to **Hashnode** with the same `.md`. |

---

## Setup

1. **Build:** `npm install` then `npm run build`
2. **Env:** copy `.env.example` → `.env` and set at least `SANITY_PROJECT_ID` (and usually `SANITY_DATASET`, `SANITY_TOKEN` for GROQ reads + publishes). The **`markdown_to_sanity_blog`** tool **fetches the latest** `blogCategory` / `blogTag` rows from Sanity on every conversion and matches your frontmatter — you do **not** need `TESSELL_DEFAULT_BLOG_CATEGORY_REF` / `TESSELL_DEFAULT_BLOG_TAG_REFS` for normal use. Use **`get_blog_categories_and_tags`** to copy exact **names** (or `_id`s) into YAML.
3. **Cursor / MCP:** point your MCP config at `node /path/to/tessell-blog-agent-mcp/dist/index.js` (or your wrapper).

---

## Tools (quick reference)

### `read_tessell_ui_features`

**Input:** `repoPath` (absolute path to your local tessell-ui clone), optional `daysBack` (default **15**), optional **`onelineOnly`**, optional **`revisionDetails`** (default **false** — add commit SHAs only if you need them), optional **`maxCommits`** (default **350**, cap 5000 — output size cap, not “lines of code changed”).  
**Does:** runs **`git log`** for the date window (no merge commits). **Default output** is **subject + message body** per merge/squash commit — the closest you can get to “PR title + PR description” **from git alone** (squash bodies usually copy the PR text). It does **not** show diffs, files, or patches. Set **`onelineOnly: true`** for titles only (no markdown header in that mode). Use GitHub’s PR page if the squash body left out reviewer context.  
**Why:** blog copy should follow product intent in the PR prose, not enumerate file changes. Pair with **`get_blog_style_guide`** so drafts intentionally mine **message bodies** for behaviors and scope, then translate into Tessell voice.

### `read_tessell_github_product_changelog`

**Input:** optional **`repoUrls`** (comma-separated GitHub URLs — if omitted, uses **`TESSELL_GITHUB_REPOS`** from `.env`), same **`daysBack`**, **`onelineOnly`**, **`revisionDetails`**, **`maxCommits`** as above, plus optional **`maxRepos`** (after dedupe; default **20**, env **`TESSELL_GITHUB_MAX_REPOS`**, cap **100**).  
**Does:** for each repo URL, **shallow-clones or updates** under **`<tessell-blog-agent-mcp>/.data/git-cache`** (or **`TESSELL_GIT_CACHE_DIR`**), then runs the **same** `git log` as `read_tessell_ui_features`. **`GITHUB_TOKEN`** (optional) is sent only as **`git -c http.extraHeader=Authorization: Basic …`** for clone/fetch — **not** embedded in `git remote` URLs. Returns **one markdown** with a `## Repository: org/repo` section per repo; one repo failing does not stop the others.  
**Why:** someone can clone **only** this MCP repo, list product GitHub URLs in `.env`, and still get PR-style changelog text for drafting. **Cross-repo “related topics”** are for the model to infer from sectioned output — not auto-clustered inside the MCP.  
**Coexists with:** `read_tessell_ui_features` when you keep a hot local UI clone and only want GitHub mode for other repos.

### `get_published_blogs`

**Input:** none.  
**Does:** loads `.env` / `.env.local` from this MCP repo, then **`@sanity/client.fetch(BLOG_POSTS_QUERY)`** — the **published** blog list your site would show, so you can compare before writing.  
**Why:** answers “do we already have a post on this?” before you draft.

### `get_blog_categories_and_tags`

**Input:** none.  
**Does:** two GROQ queries — all **`blogCategory`** and **`blogTag`** docs that are not archived and not draft, returning **`_id`**, **`name`**, **`slug`** for each. Same client/env as **`get_published_blogs`**.  
**Why:** refresh before drafting so YAML uses exact **`name`** strings (or **`slug`**) that exist today. **`markdown_to_sanity_blog`** also runs the same GROQ queries internally each time so references stay aligned with the dataset.

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
**Category & tags:** Each run **fetches the latest** `blogCategory` / `blogTag` documents from Sanity and matches frontmatter. Use **`category`** (string) + **`tags`** (YAML list of strings), and/or **`blogCategoryRef`** / **`blogTagsRefs`**. Each value can be a document **`_id`** or a label matched against **`name`** / **`slug`** (same dataset refresh as **`get_blog_categories_and_tags`** — **always** verify spelling against that tool). **`TESSELL_DEFAULT_BLOG_*`** env vars are **not** used for taxonomy. Optional **`sanityDocumentId`** republishes **in place**.  
**Images:** optional **`thumbnailImageAssetRef`** / **`mainImageAssetRef`** (Sanity **image asset** `_ref`s). Listing cards need **`thumbnailImage`**; article hero uses **`mainImage`**. Use MCP **`get_blog_image_asset_examples`** to copy refs from posts that already have art, or env **`TESSELL_DEFAULT_THUMBNAIL_IMAGE_ASSET_REF`** / **`TESSELL_DEFAULT_MAIN_IMAGE_ASSET_REF`**. If only one ref is set, it is reused for both fields.  
**Authors:** still added in Studio unless you extend the tool.  
**Draft default:** if frontmatter omits `draft`, the document gets **`draft: true`** so API pushes don’t accidentally look “live.”

### `publish_blog_to_sanity`

**Input:** exactly one of `markdownFilePath`, `sanityPayloadsJsonPath` (saved JSON from the step above), or `documentJson`. Optional `dryRun`, optional `dataset` override, optional **`generateCardImageFromContent`**.  
**Does:** resolves a `blogPost` document from Markdown (runs the same **live taxonomy resolution** as `markdown_to_sanity_blog`) or from saved JSON, optionally **generates a PNG** from **title + postSummary** (simple “Tessell” gradient card), **uploads** it as a Sanity image asset, and sets **thumbnail + main** when no thumbnail exists, then **`mutate([{ createOrReplace }])`**. This is **not** AI artwork—just readable typography for cards until design uploads real art in Studio.  
**Dry-run:** no token required; validates resolution and reports target project/dataset/slug. **Real write** needs a **write-capable** `SANITY_TOKEN` (with permission to upload assets).  
**Dataset:** defaults to `SANITY_DATASET` or **`staging`**.

### `resolve_hashnode_publication`

**Input:** optional `host` (e.g. `tessell.hashnode.dev`), or set **`HASHNODE_PUBLICATION_HOST`** in `.env`.  
**Does:** public GraphQL query to `https://gql.hashnode.com` — returns **`publication.id`** so you can set **`HASHNODE_PUBLICATION_ID`**. No PAT required.  
**Why:** one-time setup before `publish_blog_to_hashnode`.

### `publish_blog_to_hashnode`

**Input:** **`markdownFilePath`** (absolute `.md`, same file as Sanity), optional **`mode`**: `draft` (default — `createDraft`, review in Hashnode) or `publish` (`publishPost`, live). When **`mode` is omitted**, use env **`HASHNODE_PUBLISH_MODE`** (`draft` or `publish`); if unset, behavior is **draft**. Optional **`dryRun`**, optional **`publicationHost`** if `HASHNODE_PUBLICATION_ID` is unset.  
**Env:** **`HASHNODE_ACCESS_TOKEN`** — Personal Access Token from [Hashnode → Settings → Developer](https://hashnode.com/settings/developer) (send as raw `Authorization` header value, not `Bearer`). **`HASHNODE_PUBLICATION_ID`** or **`HASHNODE_PUBLICATION_HOST`** for the publication. Optional **`HASHNODE_PUBLISH_MODE`** — `draft` (default) or `publish` when the tool call omits **`mode`**. Optional **`TESSELL_BLOG_CANONICAL_BASE_URL`** — when frontmatter has no `canonicalUrl`, syndication uses `` `${BASE}/${slug}` `` as `originalArticleURL` on Hashnode.  
**Does:** parses frontmatter (`title`/`name`, `postSummary`→subtitle, `slug`, `tags` → Hashnode tag objects, body → `contentMarkdown`), then **`createDraft`** (default) or **`publishPost`** when **`mode`** / **`HASHNODE_PUBLISH_MODE`** is `publish`. See [Hashnode API docs](https://apidocs.hashnode.com/).  
**Dry-run:** validates Markdown; if token or publication is missing, returns **`dryRun: true`** with a reminder (no network call unless resolving host → id).

---

## Mental model

- **MCP does not host tessell-ui**—it shells out **git** where you point it.
- **Sanity** uses `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_TOKEN` from this repo’s `.env` (or exported in the MCP process). Keep datasets straight (**staging** vs **prod**).
- **One document per successful publish** from Markdown: each conversion can mint a new `_id`; re-posting the same `.md` without pinning an id creates **another** document—edit in Studio or reuse a fixed `_id` in the payload if you need updates.
- **Hashnode** uses the same Markdown source; each **`publishPost`** creates a new live post. Re-running without dedupe on Hashnode’s side can duplicate—**default** is **`createDraft`**; use **`mode: publish`** (or env) only when you want an immediate public post on Hashnode.

---

## License / ownership

Internal Tessell tooling; align usage with your team’s Sanity and repo policies.
