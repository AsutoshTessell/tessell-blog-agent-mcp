/**
 * Writing style guide derived from analyzing published Tessell blog posts.
 * Returned by the `get_blog_style_guide` MCP tool so the agent writes
 * in the same voice, structure, and engagement level as existing content.
 */

export const BLOG_STYLE_GUIDE = `
# Tessell Blog Writing Style Guide
(Derived from published posts on tessell.com/blog)

## Voice & Tone
- **Confident but approachable.** Write like a senior engineer explaining something to a peer over coffee — knowledgeable, not condescending.
- **First-person plural ("we", "our").** Tessell blogs speak as a team: "We're excited to announce…", "At Tessell, we've reimagined…", "What we've consistently seen is…"
- **Human and conversational, not robotic.** Use contractions ("it's", "don't", "we've"). Avoid stiff phrasing like "This document outlines" or "The following section describes."
- **Empathetic to the reader's pain.** Start from the reader's problem, not Tessell's feature list. Example: "Think about your business: every transaction creates new data. But if that data takes hours to show up…"
- **Optimistic without being salesy.** Share genuine excitement ("We're thrilled…"), but ground it in specifics, not empty hype.

## Titles
- **Action-oriented or benefit-driven**, not internal/technical labels.
  - ✅ "Raising the bar for cloud-native database security"
  - ✅ "Real-Time Data Sync with Tessell CDC and Microsoft Fabric"
  - ✅ "Why Data Lineage is the Backbone of Trusted Data Management"
  - ❌ "15-day tessell-ui merge checklist (April 2026)"  ← too internal, no benefit
  - ❌ "Recent Tessell UI updates"  ← bland, no hook
- **Reader-focused.** Ask: "Would a CTO or DBA click on this in a feed?"

## Opening / Introduction
- **Lead with the "why it matters" or the problem**, not the product.
  - ✅ "In today's fast-paced business environment, real-time decisions are the difference between leading the market and playing catch-up."
  - ✅ "Oracle cloud migration is straightforward — until it isn't."
  - ❌ "This checklist summarizes themes in tessell-ui merges from the last ~15 days."
- **Hook the reader in the first 2 sentences.** Use a relatable scenario, a bold statement, or a question.
- **State what the reader will get** from reading ("This guide captures those lessons — written from a practitioner's perspective").

## Structure
- **Use descriptive H2 headings** that tell a story, not just label sections.
  - ✅ "Why This Matters", "What's new in PCI DSS v4.1 and how Tessell maps", "Powering Growth with Microsoft Fabric"
  - ❌ "Merge themes (grouped)", "Reliability & ops", "Engineering"
- **Flowing paragraphs over bullet-only lists.** Published posts use rich paragraphs to explain context, then bullets for scannable specifics. Our generated posts were almost entirely bullet lists — that reads like release notes, not a blog.
- **Each section should have narrative.** Before bullets, write 2-4 sentences of context explaining *why* this matters. After bullets, add a sentence tying it together.
- **Customer quotes** when available (e.g., "Our migration of 500+ critical Oracle databases to Azure with Tessell was a major milestone…").
- **End with a clear takeaway** or forward-looking statement, not a disclaimer.

## Content Depth
- **Explain the business impact**, not just the technical change.
  - ❌ "Clone refresh off for most GCP engines; exception for Oracle."
  - ✅ "When teams provision clones on GCP, they'll no longer see a refresh option for engines where the platform doesn't support it — avoiding confusion and failed operations. Oracle retains clone refresh on GCP, reflecting its deeper integration."
- **Give context for acronyms and features.** Not every reader knows what DAP, PITR, or AV machines are. Briefly explain on first mention.
- **Use real scenarios and examples.** "A Fortune 250 railroad operator migrating 500+ databases to Azure…" is far more engaging than "enterprises migrating databases."
- **Connect features to outcomes.** Every technical change should answer: "So what? Why should the reader care?"

## Engagement Patterns from Published Posts
- **Questions to the reader:** "Think about your business…", "Can I trust this number on my dashboard?"
- **Analogies:** "Think of it like a GPS: just as a navigation app shows you how you got from point A to point B…"
- **Bold claims backed by proof:** "Level 1 validation means an independent QSA has assessed Tessell's controls…"
- **Social proof:** Customer quotes, analyst recognition, certification details.
- **Clear calls to action:** Links to press releases, product pages, demo requests.

## What to Avoid
- **Release-notes style** ("Disabled X for Y", "Removed Z"). Translate into reader benefit.
- **Internal jargon without explanation** (tessell-ui, feature flags, adapters, NODC, AV machines).
- **Disclaimers as endings.** Don't end with "Availability depends on…" — end with value.
- **Pure bullet lists** without narrative paragraphs connecting them.
- **Commit-message language** in the blog body (PR numbers, ticket IDs, "Fixes a crash on…").
- **Overly short posts** that read like changelogs. Aim for at least 800-1200 words with substance.

## Post Summary (postSummary field)
- 1-3 sentences, reader-facing, benefit-oriented.
- Should work as a standalone teaser on the blog grid card.
  - ✅ "At Tessell, we've reimagined how data moves across systems with our CDC platform — and through our collaboration with Microsoft Fabric, we're making it easier than ever for businesses to tap into fresh, trustworthy data."
  - ❌ "A scannable list of what landed in tessell-ui in the last ~15 days."

## SEO Title & Meta Description
- **SEO title:** Benefit-driven, 50-60 chars. Include the main keyword naturally.
- **Meta description:** 140-160 chars, action-oriented, includes what the reader gets.
`;

/**
 * Preferred slugs: well-written published posts that showcase the Tessell blog voice.
 * Falls back to a general "recent + substantial body" query if these don't exist.
 */
export const PREFERRED_SAMPLE_SLUGS = [
  'tessell-achieves-pci-dss-v4-1-certification',
  'tessell-cdc-and-microsoft-fabric',
  'why-data-lineage-is-the-backbone-of-trusted-data-management',
  'oracle-gcp-tessell',
  'how-to-migrate-oracle-database-to-cloud-lift-and-shift',
];

export const BLOG_SAMPLE_PREFERRED_QUERY = `
*[_type == "blogPost" && archived != true && draft != true && defined(postBody)
  && slug.current in $slugs]
| order(publishedDate desc) [0...5] {
  name,
  "slug": slug.current,
  postSummary,
  publishedDate,
  "category": blogCategory->name,
  "bodyText": postBody[].children[].text
}
`;

export const BLOG_SAMPLE_FALLBACK_QUERY = `
*[_type == "blogPost" && archived != true && draft != true && defined(postBody) && count(postBody) > 8]
| order(publishedDate desc) [0...3] {
  name,
  "slug": slug.current,
  postSummary,
  publishedDate,
  "category": blogCategory->name,
  "bodyText": postBody[].children[].text
}
`;
