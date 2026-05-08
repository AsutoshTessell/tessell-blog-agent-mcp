/**
 * Hashnode-specific writing style guide for Tessell blog posts.
 * Returned by the `get_hashnode_style_guide` MCP tool so the agent can
 * adapt Sanity drafts to Hashnode's audience and platform conventions
 * without losing Tessell's brand voice.
 */

export const HASHNODE_STYLE_GUIDE = `
# Hashnode Writing Guide for Tessell Blog Posts

Hashnode is a developer-first publishing platform. Its readers are practitioners —
engineers, DBAs, architects — who scan feeds by cover image and title, open posts
for depth, and share what teaches them something real. Use this guide alongside the
Tessell Blog Style Guide (get_blog_style_guide) to make every post perform well on
both Tessell's own site AND Hashnode.

---

## How Hashnode Readers Are Different from a Corporate Blog Audience

| Tessell blog (Sanity)          | Hashnode feed                              |
|--------------------------------|--------------------------------------------|
| CTOs / IT leaders also read    | Skews heavily toward hands-on engineers    |
| Formal announcement tone OK    | Personal practitioner voice performs best  |
| Long-form corporate narrative  | Scannable, shorter paragraphs preferred    |
| Cover image is nice-to-have    | Cover image is **critical** for discovery  |
| Internal audience may know Tessell | Many readers encounter Tessell for the first time |

---

## 1. TL;DR Section (Required on Hashnode)

Add a **TL;DR** block right after the intro paragraph. This is the single biggest
Hashnode-specific structural difference. Readers scroll to it immediately.

Format:
\`\`\`
## TL;DR
- What changed / what this post covers (1 sentence)
- Why it matters (1 sentence)
- The key takeaway (1 sentence)
\`\`\`

Do **not** put TL;DR in the Sanity/Tessell-site version — it looks out of place on a
corporate blog. It lives only in the Hashnode Markdown.

---

## 2. Opening Hook (Stronger on Hashnode)

On Hashnode, the first 2–3 sentences appear in preview cards. Make them count:

- **Open with a question or a relatable pain** ("Have you ever stared at an alert at 2am
  wondering if your Oracle clone is even pointing at current data?")
- **Or a bold, specific claim** ("Most database HA setups fail not because of hardware —
  but because of misconfigured failover policies.")
- **Avoid corporate opener** ("We are pleased to announce…" — this tanks engagement on Hashnode)

The Tessell brand voice carries through, but lean into the practitioner angle.

---

## 3. Tone Adjustments for Hashnode

- **First-person is fine here** — "I've seen teams lose hours to…" or "we've learned…"
  Both work; "we" keeps Tessell's team voice.
- **Shorter paragraphs.** 2–4 sentences per paragraph maximum. Hashnode readers skim fast.
- **Use callout blocks** for warnings, tips, or key insights:
  > 💡 **Tip:** If you're running Oracle on GCP, clone refresh behaves differently — see the section below.
- **Analogies outperform jargon.** "Think of it like a circuit breaker for your database
  connection pool" beats "implements exponential backoff with jitter."

---

## 4. Cover Image (Critical for Hashnode Discovery)

Hashnode uses the cover image as the primary visual in the feed — no cover image means
the post is invisible in browse/tag views.

- Recommended dimensions: **1200 × 630 px** (same as Open Graph / social share)
- The Tessell card image generated during Sanity publish (gradient, title, subtitle) works
  perfectly as a Hashnode cover — pass it via **\`coverImageURL\`** in frontmatter:
  \`\`\`yaml
  coverImageURL: https://cdn.sanity.io/images/{projectId}/{dataset}/{assetId}.png
  \`\`\`
- This URL is returned by \`publish_blog_to_sanity\` as \`generatedImageUrl\` and is
  automatically injected into the draft frontmatter — no manual step needed.

---

## 5. Tags (Up to 5 — Choose Carefully)

Hashnode uses tags for feed distribution. Wrong tags = no discovery.

**Use specific, popular Hashnode tags for Tessell content:**

| Tessell topic                 | Good Hashnode tags                                  |
|-------------------------------|-----------------------------------------------------|
| Oracle / PostgreSQL / SQL Server | \`oracle\`, \`postgresql\`, \`sql\`, \`database\`         |
| High availability / DR        | \`devops\`, \`cloud\`, \`database\`, \`infrastructure\`   |
| Multi-cloud (AWS/Azure/GCP)   | \`aws\`, \`azure\`, \`googlecloud\`, \`cloud\`            |
| Database management           | \`database\`, \`dba\`, \`backend\`, \`devops\`            |
| Security / compliance         | \`security\`, \`cloud\`, \`devops\`                      |
| CDC / data pipelines          | \`dataengineering\`, \`database\`, \`backend\`            |

Limit: **5 tags max.** Pick the 5 most specific to the post topic — do not use generic
tags like \`programming\` or \`technology\` as fillers.

---

## 6. Structure Differences (Hashnode vs Sanity)

| Element               | Sanity (Tessell site)                  | Hashnode adaptation                       |
|-----------------------|----------------------------------------|-------------------------------------------|
| TL;DR                 | Omit                                   | **Add after intro** (required)            |
| Paragraph length      | 4–8 sentences OK                       | 2–4 sentences preferred                   |
| Section headings      | Story-driven H2s                       | Same — keep them                          |
| Code blocks           | Use when relevant                      | Use liberally — engineers expect them     |
| Customer quotes       | Great                                  | Great — keep them                         |
| CTA at end            | "Learn more" / product link            | Add "Follow for more" or newsletter nudge |
| Canonical URL         | N/A                                    | **Always set** to the Tessell blog URL    |

---

## 7. Canonical URL (Always Set)

Every Hashnode post syndicated from Tessell's blog must have:
\`\`\`yaml
canonicalUrl: https://www.tessell.com/blog/{slug}
\`\`\`

This prevents Hashnode's copy from competing with Tessell's SEO. If
\`TESSELL_BLOG_CANONICAL_BASE_URL\` is set in the MCP env, it is applied automatically.

---

## 8. Table of Contents

For posts longer than ~1000 words, enable Hashnode's built-in TOC by ensuring your H2
headings are clear and sequential. The \`publish_blog_to_hashnode\` tool sets
\`enableTableOfContent: true\` automatically for posts with 3+ H2 sections.

---

## 9. Closing CTA for Hashnode

End with a practitioner-friendly close — not just a product link:

✅ "If you're evaluating database HA options on AWS, we'd love to show you how Tessell
handles it. [Book a demo] or follow this publication for the next post in this series."

❌ "Contact sales at tessell.com."

---

## 10. What NOT to Change When Adapting for Hashnode

- **Do not change the core facts or technical content** — only tone/structure
- **Do not remove customer quotes** — they add credibility on Hashnode too
- **Do not add speculative claims** not in the Sanity draft
- **Do not shorten so much that depth is lost** — Hashnode rewards thorough posts; aim
  for 700–1200 words minimum
- **Keep Tessell's "we" voice** — do not switch to "they" about Tessell

---

## 11. postSummary Character Limit (Critical for Hashnode Subtitle)

The \`postSummary\` frontmatter field is used as the Hashnode **subtitle**, which has a
hard 250-character API limit. The MCP tool clips anything longer — but a clean clip
is only guaranteed when the summary ends at a sentence boundary.

**Rule: keep \`postSummary\` to 1–2 sentences and ≤ 220 characters.**

✅ Good (189 chars, ends at a sentence boundary):
> "Oracle PDB Phase 2 features — smarter cloning, conflict-aware backup scheduling, and
> reliable clone target discovery — are now fully available on AWS."

❌ Bad (runs long, mid-sentence clip risk):
> "Oracle PDB Phase 2 capabilities including smarter PDB cloning, reliable clone target
> discovery, and conflict-aware backup scheduling are now fully available on AWS. Teams
> managing multi-tenant Oracle databases can now do more, with less guesswork, and the
> full set of capabilities is covered in this post."

If your summary is naturally two sentences, make sure the **first sentence alone fits
under 220 characters** — that way even if the second sentence pushes over the limit,
the clip falls on a clean period.

---

## Quick Checklist Before Publishing to Hashnode

- [ ] TL;DR block present after intro
- [ ] Cover image URL set (\`coverImageURL\` in frontmatter — auto-injected from Sanity publish)
- [ ] Canonical URL set (\`canonicalUrl\` in frontmatter)
- [ ] 3–5 relevant Hashnode tags in \`tags\` frontmatter list
- [ ] First paragraph hooks within 2 sentences
- [ ] Paragraphs ≤ 4 sentences
- [ ] Closing CTA is practitioner-friendly, not just a sales link
- [ ] \`postSummary\` is ≤ 220 characters and ends at a sentence boundary
`;
