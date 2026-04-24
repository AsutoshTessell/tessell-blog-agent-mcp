# Tessell blog agent workflow (MCP)

Use this end-to-end when generating a “what’s new” or similar post from **tessell-ui** and optionally **publishing** to Sanity.

## Steps

1. **`get_blog_style_guide`** + **`get_published_blog_samples`** *(call first, before writing anything)*  
   The style guide returns Tessell's blog voice, structure, and anti-patterns. The samples tool fetches 3 recent published posts with **full body text** so you can study real examples of tone, paragraph flow, and engagement. **Read both outputs carefully before drafting.**

2. **`read_tessell_ui_features`**  
   Pass **`repoPath`**: absolute path to the local tessell-ui git repo (e.g. `/path/to/tessell-ui4`). Optional **`daysBack`** (default **14**). Review the `git log` output for notable UI/product changes.

3. **`get_published_blogs`**  
   No arguments. Compare titles/summaries against what you would write so you do not duplicate an existing post.

3b. **`get_blog_categories_and_tags`**  
   No arguments. Calls Sanity (same env as other tools) and returns usable **`blogCategory`** and **`blogTag`** rows with **`_id`**, **`name`**, **`slug`**. Use the chosen **`_id`s** in draft frontmatter as **`blogCategoryRef`** and **`blogTagsRefs`** so **`markdown_to_sanity_blog`** / **`publish_blog_to_sanity`** payloads validate in Studio.

3c. **`get_blog_image_asset_examples`** (optional — avoids gray cards)  
   No arguments. Returns recent posts that already have thumbnails, with **`thumbnailAssetRef`** / **`mainAssetRef`**. Paste those into draft frontmatter as **`thumbnailImageAssetRef`** and **`mainImageAssetRef`** (same values as Tessell blog grid + hero expect).

4. **Write the draft** following the style guide  
   Use rich paragraphs (not bullet-only lists), reader-facing headings, a strong opening hook, business context for every technical change, and a forward-looking close. The post should read like the published samples — not release notes.

5. **`save_blog_draft`**  
   Save the Markdown draft: **`title`**, **`markdownContent`** (body + optional YAML frontmatter), **`draftsFolderPath`** (e.g. `/path/to/tessell-blog-agent-mcp/drafts`). Or write the file manually with a dated filename.

4. **`markdown_to_sanity_blog`**  
   Pass **`markdownFilePath`** (absolute path to the `.md` file). Use the returned **`apiReady`** / **`studioFriendly`** JSON (or save the JSON next to the draft as `*.sanity-payloads.json` for reuse).  
   **Category & tags (required in CMS):** in frontmatter use **`blogCategoryRef`** (one Sanity document `_id` for `blogCategory`) and **`blogTagsRefs`** (YAML list of `_id`s, or one comma-separated string) — **or** set **`TESSELL_DEFAULT_BLOG_CATEGORY_REF`** and **`TESSELL_DEFAULT_BLOG_TAG_REFS`** in `.env` so every post gets them without repeating YAML.  
   If frontmatter omits **`draft`**, the generated document defaults to **`draft: true`** in Sanity. Set **`draft: false`** when you intend a live post.

5. **`publish_blog_to_sanity`** (optional — writes to the CMS)  
   Requires **`SANITY_TOKEN`** with **write** access and **`SANITY_PROJECT_ID`** / **`SANITY_DATASET`** in `.env` (see `.env.example`).  
   Provide **exactly one** of:
   - **`markdownFilePath`** — same draft `.md` (converts and posts), or  
   - **`sanityPayloadsJsonPath`** — path to a saved `*.sanity-payloads.json` from step 4, or  
   - **`documentJson`** — stringified `apiReady.document`.  
   Use **`dryRun: true`** first to validate resolution without calling Sanity.  
   **Images:** either set **`thumbnailImageAssetRef`** / **`mainImageAssetRef`** in frontmatter (optional **`TESSELL_DEFAULT_*`** in `.env`), reuse refs from **`get_blog_image_asset_examples`**, **or** pass **`generateCardImageFromContent: true`** (or **`TESSELL_AUTO_GENERATE_BLOG_CARD_IMAGE=true`** in `.env`) so a **PNG is generated from title + postSummary**, uploaded to Sanity, and attached when no thumbnail exists yet.  
   Open **Sanity Studio** for **authors** if still required by your schema.

## Reply expectations

Summarize **what changed in the UI** (from git), **what was missing from existing blogs**, which **category/tag `_id`s** you used, **how images were handled** (refs from examples, env, or **`generatedImageAssetId`** from auto-generate), where the **draft** and **`.sanity-payloads.json`** live, and **`markdown_to_sanity_blog`** / **`publish_blog_to_sanity`** results (**`dryRun`** vs live).

---

## Quick prompt (copy-paste)

**One line (agent infers the rest):**

```text
Use the Tessell blog MCP: first read get_blog_style_guide and get_published_blog_samples to learn the tone; then scan tessell-ui git (~15 days) vs published blogs; draft the gaps in the same voice as existing posts (not release notes), save under tessell-blog-agent-mcp/drafts, convert, publish (dry run then live), generateCardImageFromContent if no image — use my absolute tessell-ui repoPath.
```

**A bit more explicit:**

Use the **Tessell blog MCP** tools. **Scan the local tessell-ui git repo** for what merged in the **last ~15 days** (`read_tessell_ui_features` with the correct **repoPath** and **daysBack: 15**), **compare to** `get_published_blogs`, **add** `blogCategoryRef` / `blogTagsRefs` from `get_blog_categories_and_tags`, **write a draft** for important gaps, **save** under your `tessell-blog-agent-mcp/drafts` folder, **run** `markdown_to_sanity_blog` and save `*.sanity-payloads.json` if useful, then **`publish_blog_to_sanity`** with **dryRun true** then **dryRun false**; use **`generateCardImageFromContent: true`** if there’s no thumbnail. Summarize: draft path, category/tag refs, image handling, dry-run vs live, what changed in the UI vs what the blog already covered. Authors may still be needed in Studio after publish.

*Replace the drafts path and tessell-ui **repoPath** with your machine’s absolute paths if different.*

---

## Full prompt (explicit)

Paste this if you want every step and field spelled out:

```
Check the tessell-ui repository for new features from roughly the last two weeks using the MCP tool that reads git history (read_tessell_ui_features), passing the correct local tessell-ui repoPath and about 14 days. Compare what you find against our published blogs by calling get_published_blogs. Call get_blog_categories_and_tags and put sensible blogCategoryRef and blogTagsRefs in the draft’s YAML; optionally call get_blog_image_asset_examples if you want to reuse existing image asset _refs for thumbnailImageAssetRef and mainImageAssetRef, or leave those unset. Write a new Markdown blog post for anything important that isn’t already covered and save the draft under /Users/asutoshbhere/tessell-blog-agent-mcp/drafts using the save-draft tool or a dated .md file. After the draft exists, run markdown_to_sanity_blog on that file and save the API-ready output as a sibling *.sanity-payloads.json if helpful. Optionally call publish_blog_to_sanity: run with dryRun true first, then with dryRun false using markdownFilePath or sanityPayloadsJsonPath and a write-capable SANITY_TOKEN in .env; to avoid gray listing cards without picking manual refs, use generateCardImageFromContent true (or set TESSELL_AUTO_GENERATE_BLOG_CARD_IMAGE in .env) so a card image is generated from the title and summary and uploaded when no thumbnail is set. After a real write, note that Studio may still need authors. In your reply, give the draft path, chosen category and tag refs, how images were handled (examples/refs vs generated card / generatedIma
geAssetId), conversion and publish results including dry-run vs live, and a short summary of what changed in the UI and what was missing from the blog.
```

Adjust the **drafts path** if your machine uses a different folder.
