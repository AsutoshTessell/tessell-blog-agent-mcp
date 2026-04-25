# Tessell blog agent workflow (MCP)

Use this end-to-end when generating blog posts from **tessell-ui** changes and optionally **publishing** to Sanity.

## Steps

1. **Learn the voice and strategy**  
   Call **`get_blog_style_guide`** and **`get_published_blog_samples`** first — before looking at git or writing anything.  
   - The **style guide** covers tone, structure, engagement patterns, anti-patterns, **PLUS content strategy**: how to decide one post vs multiple, what deserves a blog vs what doesn't, the **"What → Why → How It Helps"** section pattern, and audience context.  
   - The **samples** return full body text from well-written published posts. Study how they open, how they structure sections, how subheadings tell a story, and how every feature gets context and business impact.

2. **Scan recent changes**  
   Call **`read_tessell_ui_features`** with **`repoPath`** (absolute path to tessell-ui) and **`daysBack`** (~15).

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

5. **Get taxonomy**  
   Call **`get_blog_categories_and_tags`**. Pick the right **`blogCategoryRef`** and **`blogTagsRefs`** for your post(s).

6. **Write the draft(s) — match the pattern to the content**  
   Find the published sample that's **most similar** to what you're writing and mirror its structure:
   - **Announcement?** → "We're excited…" → "Why it matters" → benefits → philosophy close.
   - **Problem → Solution?** → Reader's pain → concept explanation → how Tessell solves it → customer proof.
   - **Practitioner deep dive?** → "Why this guide exists" → scenario-based sections → technical walkthrough.
   - **Platform update?** → Reader's daily frustration → themed groups with narrative → bigger vision close.
   
   For each feature mentioned, naturally weave in: what it is, why it matters, and what the reader gets — but don't force a rigid template. Use rich paragraphs, not bullet-only lists.

7. **Write a Platform Update post for skipped items**  
   After the primary post(s), create a secondary **"What's New in the Tessell Console — [Month Year]"** post covering items that were skipped or too small for standalone posts (GCP guard-rails, stability fixes, build improvements, minor UI tweaks). See the style guide's "Secondary Platform Update Post for Skipped Items" section for rules.  
   - **Category:** Database Management. **Tone:** Platform Update pattern.  
   - **Mark `draft: true`** so marketing can decide whether to publish or rework.  
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
Use the Tessell blog MCP: first read get_blog_style_guide and get_published_blog_samples to learn the voice, patterns, and content strategy; then scan tessell-ui git (~15 days) vs published blogs; decide what deserves a post vs what to skip, one post or multiple; find the published sample most similar to your content and mirror its structure; also create a "What's New in the Tessell Console" platform update post for skipped items (so marketing has visibility); save all under tessell-blog-agent-mcp/drafts, convert, publish (dry run then live), generateCardImageFromContent if no image — use my absolute tessell-ui repoPath.
```
