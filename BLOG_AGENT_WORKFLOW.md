# Tessell blog agent workflow (MCP)

Use this end-to-end when generating blog posts from **tessell-ui** changes and optionally **publishing** to Sanity.

## Steps

1. **Learn the voice and strategy**  
   Call **`get_blog_style_guide`** and **`get_published_blog_samples`** first — before looking at git or writing anything.  
   - The **style guide** covers tone, structure, engagement patterns, anti-patterns, **PLUS content strategy**: how to decide one post vs multiple, what deserves a blog vs what doesn't, the **"What → Why → How It Helps"** section pattern, and audience context.  
   - The **samples** return full body text from well-written published posts. Study how they open, how they structure sections, how subheadings tell a story, and how every feature gets context and business impact.

2. **Scan recent changes (order matters)**  
   - **If `TESSELL_GITHUB_REPOS` is set** in `tessell-blog-agent-mcp/.env`: **always call `read_tessell_github_product_changelog` first** with **`daysBack`** (and optional **`maxCommits`**, **`maxRepos`**, **`revisionDetails`**, **`onelineOnly`**). Add **`GITHUB_TOKEN`** for private repos. It shallow-clones into **`<mcp>/.data/git-cache`** (override with **`TESSELL_GIT_CACHE_DIR`**), runs **`git log`** per repo, and returns **one combined** markdown — synthesize **cross-repo themes** when drafting (UI + API, etc.).  
   - **Fallback:** if that tool **errors**, returns no usable output, or every repo fails — call **`read_tessell_ui_features`** with the **same** window: **`repoPath`** (absolute local clone) or env **`TESSELL_UI_REPO`**. Default output is **PR-style text** (squash **subject + body** — not file diffs). Use **`revisionDetails: true`** only if you need commit SHAs for traceability.  
   - **If `TESSELL_GITHUB_REPOS` is not set:** use **`read_tessell_ui_features`** only.  
   Prefer squash **bodies** for blog depth; open GitHub PRs when the squash message is thin.  
   *Note: `.env` does not run tools by itself — the assistant must invoke the MCP tool; the Cursor rule `00-tessell-blog-mcp-invoke.mdc` encodes the order above.*

3. **Analyze published content**  
   Call **`get_published_blogs`**. Don't just check for duplicates — analyze:
   - Which **categories** are well-covered vs underserved?
   - What **titles and summaries** are most engaging?
   - What **depth and quality bar** does Tessell set for blog-worthy content?
   - Do the git changes meet that bar, or should some be skipped / consolidated?

4. **Decide: one post, multiple posts, or skip**  
   Using the style guide's content strategy rules:
   - **Separate posts** for changes targeting different audiences or substantial enough for a deep dive.
   - **One combined post** for thematically related changes that tell a cohesive story.
   - **Skip** pure test additions, internal tooling, embarrassing bug fixes, feature flags without user context.
   - **Mention briefly** (within a larger post): stability fixes, build improvements, minor UI tweaks.

5. **Get taxonomy (every time)**  
   Call **`get_blog_categories_and_tags`** and pick **`category`** + **`tags`** in frontmatter using **exact `name` strings** (or slugs) from the response, or paste document **`_id`s** into **`blogCategoryRef`** / **`blogTagsRefs`**. The **`markdown_to_sanity_blog`** tool also **fetches the latest** categories and tags from Sanity on each run and matches your YAML — do **not** use **`TESSELL_DEFAULT_BLOG_*`** in `.env` for taxonomy.

6. **Write the draft(s) — match the pattern to the content**  
   **Ground every post in context from `read_tessell_ui_features` and/or `read_tessell_github_product_changelog`:** default output includes **merge subject + full message body** (PR-style). Use the **bodies** — not only the first line per commit — for behaviors, edge cases, and scope. Synthesize related blocks into themes (including **across repositories** when you used the GitHub multi-repo tool); translate into reader-facing prose (never paste raw ticket lists as the post). If the style guide (`get_blog_style_guide`) disagrees with shortcutting this step, follow the style guide on using tessell-ui source material.  
   Find the published sample that's **most similar** to what you're writing and mirror its structure:
   - **Announcement?** → "We're excited…" → "Why it matters" → benefits → philosophy close.
   - **Problem → Solution?** → Reader's pain → concept explanation → how Tessell solves it → customer proof.
   - **Practitioner deep dive?** → "Why this guide exists" → scenario-based sections → technical walkthrough.
   - **Platform update?** → Reader's daily frustration → themed groups with narrative → bigger vision close.
   
   For each feature mentioned, naturally weave in: what it is, why it matters, and what the reader gets — but don't force a rigid template. Use rich paragraphs, not bullet-only lists.
   - **`draft: true`** in YAML for **every** generated post (primary thematic posts included) until marketing clears the draft in Sanity.

7. **Write a Platform Update post for skipped items**  
   After the primary post(s), create a secondary **"What's New in the Tessell Console"** post covering items that were skipped or too small for standalone posts (GCP guard-rails, stability fixes, build improvements, minor UI tweaks). **Title the post for the actual git window** (e.g. April–May 2026 or a date range when `daysBack` spans months — not only the current calendar month). See the style guide's "Secondary Platform Update Post for Skipped Items" section for rules.  
   - **Category:** Database Management. **Tone:** Platform Update pattern.  
   - **Draft:** Same as primary posts — **`draft: true`** until marketing publishes.  
   - **Exclude** pure test additions.  
   - **Minimum 3 skipped items** needed; otherwise fold into the primary post as "Also in this release."

8. **Save, convert, publish**  
   - **`save_blog_draft`** or write to `tessell-blog-agent-mcp/drafts`.
   - **`markdown_to_sanity_blog`** → save `*.sanity-payloads.json`.
   - **`publish_blog_to_sanity`**: **`dryRun: true`** first, then **`dryRun: false`**.
   - Use **`generateCardImageFromContent: true`** if no thumbnail image.
   - Publish **both** the primary post(s) and the platform update post.
   - Note: **authors** may need to be added in Studio.

## Reply expectations

Summarize: **content strategy decision** (one post / multiple / what was skipped and why), **what changed in the UI**, **what was missing from existing blogs**, **category/tag refs**, **image handling**, **draft path(s)**, **platform update post** (what it covers), and **publish results** (dry-run vs live for all posts).

---

## Quick prompt (copy-paste)

```text
Use the Tessell blog MCP: first read **`get_blog_style_guide`** and **`get_published_blog_samples`**; if **`TESSELL_GITHUB_REPOS`** is set, call **`read_tessell_github_product_changelog`** first (same **`daysBack`**), else on failure call **`read_tessell_ui_features`** with full **subject + body** per merge. Draft using that context **and** the style guide; compare vs published blogs; decide one post or multiple; mirror the closest published sample; add a "What's New in the Tessell Console" platform update for skipped items where applicable; save under tessell-blog-agent-mcp/drafts, convert, publish (dry run then live), generateCardImageFromContent if no image — use my absolute tessell-ui repoPath for fallback if needed.
```
