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

### Source material from product repos (merge messages)

**Single repo (local UI):** When using **\`read_tessell_ui_features\`**, **always** use the full output with default options (\`onelineOnly\` **false** so you get **subject + message body** per merge).

**Multi-repo (GitHub list in \`TESSELL_GITHUB_REPOS\`):** When using **\`read_tessell_github_product_changelog\`**, you get the **same** \`git log\` format (subject + body per commit, no diffs), **one combined markdown** with a section per repository. Treat each section like the UI log above, and **synthesize across sections** when the same feature ships as API + console work (e.g. new OpenAPI path + UI calling it with the right query flags).

- **The body is the depth layer.** After each \`---\` separator you get a **title line** (like a PR subject) and then a **body** — often the same narrative as the GitHub PR description (Squash merge), including bullet lists, testing notes, behavioral detail, and edge cases. **Read and use that body** for *what* shipped and *why* it matters technically; then **rewrite** in Tessell blog voice for the reader — do not stop at the title line alone.
- **Synthesize across blocks** that share a theme (e.g. multiple GCP-related merges, or UI + API spec for one capability) into one story with clear H2 sections; the merge messages are **source notes**, not draft copy.
- **If a body is thin or empty**, use the \`(#NNNN)\` in the subject to open the GitHub PR for the full description, or ask for product/marketing context — do not invent behavior the text does not support.
- Even when grounded in this material, the published post must still follow **What to Avoid** below: no raw ticket IDs, no paste of internal bullet lists as the whole article — **translate** merge/PR prose into customer-facing blog copy.

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
  - ❌ "A scannable list of what landed in tessell-ui (or raw multi-repo git output) in the last ~15 days."

## SEO Title & Meta Description
- **SEO title:** Benefit-driven, 50-60 chars. Include the main keyword naturally.
- **Meta description:** 140-160 chars, action-oriented, includes what the reader gets.

---

# Content Strategy: What to Write, When, and How Many Posts

## Deciding: One Post or Multiple Posts?

Before writing, analyze the git changes and ask:

**Create SEPARATE posts when:**
- Changes span **completely different audiences** (e.g. a GCP networking change and a SQL Server backup policy — a GCP DBA doesn't care about SQL Server collation).
- A single change is **substantial enough** to justify its own deep dive (e.g. a major new workflow, a new cloud supported, a new engine).
- Published blogs show that Tessell typically covers **one theme per post** (PCI certification = 1 post, CDC + Fabric = 1 post, Data Lineage = 1 post).

**Create ONE combined post when:**
- Changes are **thematically related** (e.g. multiple GCP refinements → one "GCP experience" post).
- Individual changes are too small to stand on their own (a null-fix alone isn't a blog post).
- The changes together tell a **cohesive story** for a single audience (e.g. "multi-cloud console refinements" for platform engineers).

**Optional THIRD standalone (e.g. cloud-focused) when:**
- You have **several user-facing items for one cloud** (GCP, Azure, or AWS) that share one narrative — e.g. guardrails + clone behavior + observability + policy UI all saying "this cloud's console is honest about what works" — **and** a single combined post would bury that cloud for SEO/marketing. Prefer a titled deep dive like "Sharper GCP guardrails in the Tessell console" **plus** the mandatory platform roundup for everything else — do **not** duplicate the same paragraphs in both; tease the cloud post from the roundup in one sentence instead.
- You do **not** need a third post when those cloud items are few or already the hero of a primary engine post; use judgment and \`get_published_blogs\` (avoid repeating a recent GCP angle).

**Rule of thumb:** If you can write a compelling title and opening hook for a single post that covers all the changes naturally — keep it as one. If the title would have to be vague ("Various Updates") to fit everything — split.

**Before you write — quick checklist:**
1. Note the **changelog window** (e.g. \`daysBack: 25\` from "today") and the **calendar span** it covers; platform roundup naming must match that span (see **Secondary "Platform Update"** below).
2. List **2–4 candidate themes** from merges; assign each to *standalone*, *roundup*, or *skip*.
3. Check **\`get_published_blogs\`** for recent titles on the same theme; pick a different angle or merge if redundant.
4. After standalones, **everything else user-facing** that is not test-only → platform roundup (or "Also in this release" if fewer than 3 small items).

## What's Worth a Blog Post vs What Isn't

**WRITE a blog post for:**
- New cloud support, new engine support, new integration (CDC, Fabric, etc.)
- Security milestones (certifications, compliance)
- Workflow improvements that change how users interact with the product
- Performance improvements with measurable impact
- Features that solve a pain point customers have voiced
- Multi-cloud parity improvements (GCP catching up to AWS/Azure)

**DON'T write a blog post for:**
- Pure test additions (unit tests for existing features)
- Internal build tooling changes (Rspack, Rsbuild) unless there's a user-facing angle
- Bug fixes that are embarrassing to highlight (crashes, null checks)
- Feature flag additions without user-facing context
- Refactors, code cleanup, or dependency updates

**GRAY AREA — mention briefly within a larger post but don't lead with:**
- Stability fixes (mention as "reliability investments" in a broader post)
- Build improvements (mention as "engineering velocity" briefly at the end)
- Minor UI tweaks (consolidate into a bigger story)

## Sanity \`draft\` flag for generated posts

Posts produced from changelog scans (UI and/or multi-repo GitHub), MCP tools, or automated drafts — **including primary thematic posts** (e.g. GCP, SQL Server deep dives) **and** the secondary Platform Update roundup — should use **\`draft: true\`** in YAML frontmatter. Marketing (or an explicit human step) clears the draft in Sanity when a post is approved for the live site. Do not set \`draft: false\` on generated posts unless the workflow explicitly says to publish immediately.

## Secondary "Platform Update" Post for Skipped Items

After creating the primary blog post(s), ALWAYS create a secondary **"What's New in the Tessell Console"** post that covers the items that were skipped or deemed too small for a standalone post. This serves the marketing team as an internal reference and optionally publishable update.

**Why:** Even items that aren't blog-worthy on their own (GCP guard-rail tweaks, stability fixes, build tooling, minor UI improvements) are valuable for the marketing and product team to know about. They can decide whether to publish, rework, or use it as briefing material.

**Rules for the Platform Update post:**
- **Title pattern (pick one that matches the git window — do not use a single calendar month unless all commits fall in that month):**
  - **Preferred when \`daysBack\` spans two months:** "What's New in the Tessell Console — [StartMonth]–[EndMonth] [Year]" (e.g. "… — April–May 2026") or **explicit range**: "… — Apr 7–May 2, 2026" if you state the as-of date in the intro.
  - **OK when the entire window is inside one month:** "What's New in the Tessell Console — [Month Year]" (e.g. "… — April 2026").
  - **Avoid:** Labeling the roundup with only the **current** month (e.g. "May") when most or much of the changelog is from the **previous** month — that misleads readers and marketing.
  - **Intro line:** Optionally one sentence stating the window (e.g. "Here is what landed in the roughly 25 days through [date].") so the post is self-explanatory.
- **Category:** Database Management (broadest fit for cross-cutting platform changes)
- **Tone:** Platform Update pattern — accessible, grouped by theme, each item gets 2-4 sentences of narrative context (not raw commit messages)
- **Structure:**
  1. Opening: Brief intro about continuous platform improvements
  2. Themed sections (e.g. "Multi-Cloud Refinements", "Reliability & Stability", "Under the Hood") — each with narrative context explaining what changed and why it matters
  3. Closing: Forward-looking statement about upcoming improvements
- **What to include:** GCP guard-rails, stability fixes, networking improvements, build/performance work, minor UI refinements — anything that was "skipped" or "gray area" from the primary post decision
- **What to still exclude:** Pure test additions (unit tests) — even marketing doesn't need to know about test file additions
- **Framing:** Translate every change into reader-facing language. Never use commit messages, PR numbers, or internal jargon.
  - ❌ "Disable prechecks and feasibility checks UI for GCP cloud"
  - ✅ "The console now only surfaces pre-check and feasibility controls on clouds where they're fully supported — reducing confusion for GCP users"
- **Mark as draft:** Same rule as all generated posts — \`draft: true\` in YAML until marketing publishes (see **Sanity \`draft\` flag for generated posts** above).
- **Minimum bar:** At least 3 skipped items needed to justify a platform update post. If fewer than 3 items were skipped, fold them into the primary post as a brief "Also in this release" section instead

## Section Structure: Match the Pattern to the Content

Published Tessell blogs use DIFFERENT structures depending on the type of content. Do NOT force a single rigid pattern on every post. Instead, study the published blog samples you receive and pick the structure that fits your content best.

**Common patterns found in published posts:**

**Announcement / Milestone** (e.g. PCI DSS certification, Gartner recognition):
- Open with the news: "We're excited to announce…"
- "Why it matters" section with industry context
- What's new and how it maps to the product
- Benefits for specific audiences (fintech, public sector, etc.)
- Philosophy / forward-looking close

**Problem → Solution narrative** (e.g. CDC + Fabric, Data Lineage):
- Open with the reader's pain point or a relatable question
- Explain the concept (with analogies if helpful)
- Show how Tessell addresses it
- Customer quote or social proof
- Closing takeaway

**Practitioner deep dive** (e.g. Oracle Migration, Oracle on GCP):
- "Why this guide exists" — establish credibility
- Scenario-based sections ("Common Migration Scenarios", "Pre-Migration: Where Migrations Are Won or Lost")
- Detailed technical walkthrough with enterprise context
- Real customer examples woven in

**Platform update / What's new** (e.g. multi-cloud console improvements):
- Open with the reader's daily experience / frustration
- Group changes by theme (each theme gets narrative + specifics)
- Explain business impact, not just the change
- Close with the bigger vision

**How to choose:** Look at the published samples. Find the one closest to what you're writing. Mirror its structure. If none match exactly, combine elements — but always ensure each section has narrative context, not just bullet points.

**For any pattern, each feature or change mentioned should still answer three implicit questions** (weave them into the narrative naturally — don't use them as literal subheadings):
- What is this?
- Why does it matter to the reader?
- What's the outcome?

## Understanding Tessell's Audience and Domain

**Primary readers:**
- **DBAs and database engineers** managing Oracle, SQL Server, PostgreSQL, MySQL across clouds
- **Platform/infrastructure engineers** building and operating multi-cloud database estates
- **CTOs, VPs of Engineering, IT leaders** evaluating or expanding Tessell adoption
- **Compliance and security teams** concerned with governance, DR, and data protection

**What they care about:**
- Reducing manual toil in database operations
- Multi-cloud consistency (same experience on AWS, Azure, GCP)
- Data protection, disaster recovery, compliance confidence
- Cost reduction vs. self-managed or legacy managed services
- Production-grade reliability (uptime, maintenance, monitoring)

**How published Tessell blogs serve them:**
- **Deep dives** for practitioners (Oracle migration guide, SQL Server HA)
- **Announcements** for leadership (Gartner recognition, Series B, certifications)
- **Integration stories** for architects (CDC + Fabric, FSx for ONTAP)
- **Platform updates** for operators (what's new in the console experience)

When writing, always ask: "Which of these audiences am I writing for?" and "What do they get from reading this?"

## Learning from Published Blog Patterns (PRIMARY — do this before writing)

The published posts ARE your strategy. Don't rely on generic rules — derive your approach from what's actually on the blog.

When you receive the full list of published posts (from get_published_blogs), systematically analyze:

**1. Content landscape:**
- Which categories have the most posts? Which are underserved?
- When was the last post in each relevant category?
- What topics have been covered deeply vs lightly?

**2. Quality and engagement bar:**
- What titles get the most descriptive, engaging summaries?
- How long are the summaries? What language do they use?
- Do similar posts exist for the changes you're writing about? If so, what angle did they take?

**3. Tone per category:**
- Announcements → celebratory, "We're excited…", forward-looking
- Oracle / SQL Server / engine-specific → practitioner-focused, detailed, technical credibility
- Database Management → concept-explaining, analogy-rich, accessible
- Governance → compliance-focused, trust-building, regulatory context

**4. Pattern matching for new content:**
- Find the 1-2 published posts MOST SIMILAR to what you're about to write
- Mirror their structure, heading style, depth, and tone
- Improve where you can (better hook, clearer examples, stronger close) but stay consistent with the brand

**5. Gap analysis:**
- If published blogs have deep content on Oracle and PostgreSQL but nothing on SQL Server DAP — that's a gap worth filling
- If GCP was recently covered in a "Fully Managed Oracle on GCP" post — a new GCP post should take a DIFFERENT angle (e.g. console experience, not deployment)
- If there are many Announcements but few practitioner guides — lean toward the practitioner style for technical changes
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
