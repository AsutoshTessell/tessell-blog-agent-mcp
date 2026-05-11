# Tessell Blog Agent MCP

Every time your team ships a feature, someone has to figure out what changed, write a blog post that explains it clearly, match Tessell’s tone, and publish it to the website and Hashnode. That used to take days per post — and often got skipped entirely.

This MCP fixes that. Say *“Generate and publish Tessell blogs from the past 15 days”* and the AI does the entire pipeline automatically.

**From GitHub commits to published blog posts in one prompt.**

---

## How It Works

The pipeline runs in four phases. Each phase calls specific MCP tools in order:

### Phase 1 · Learn the Voice

Before writing anything, the AI learns how Tessell blogs look and sound.

| Tool | What it does |
| --- | --- |
| `get_blog_style_guide` | Style guide built by analyzing tessell.com/blog — tone, structure, anti-patterns |
| `get_published_blog_samples` | Fetches full content of recent posts so the AI can match writing quality |
| `get_published_blogs` | Fetches post titles to avoid writing duplicate topics |
| `get_blog_categories_and_tags` | Fetches live taxonomy from Sanity for correct frontmatter values |
| `get_hashnode_style_guide` | Hashnode-specific tone guide based on platform conventions |

### Phase 2 · Read What Shipped

The AI reads commit messages (PR descriptions) from the past N days — not diffs, not file lists, just the PR title + body that explains *what* was built and *why*.

| Tool | When it’s used |
| --- | --- |
| `read_tessell_github_product_changelog` | **Primary** — used when `TESSELL_GITHUB_REPOS` is set in `.env` |
| `read_tessell_ui_features` | **Fallback** — reads a local tessell-ui clone on disk |

> If neither is configured, the pipeline stops with a clear error.

### Phase 3 · Decide & Draft

The AI decides what deserves a post, writes it, and saves it locally as a draft.

| Decision | When |
| --- | --- |
| **Standalone deep-dive** | A major new capability or cross-cloud milestone |
| **Combined narrative** | 2–3 related changes that tell one story |
| **Platform Roundup** | Everything else worth mentioning but not a full post |
| **Skip** | Internal changes, test additions, CI/CD — nothing user-facing |

Tool used: **`save_blog_draft`** — saves each post as a `.md` file with full frontmatter (title, slug, SEO summary, category, tags) under `drafts/`.

### Phase 4 · Convert & Publish

For each draft, the AI publishes to Sanity and then Hashnode — both as drafts by default.

| Tool | What it does |
| --- | --- |
| `markdown_to_sanity_blog` | Converts `.md` → Sanity Portable Text JSON |
| `publish_blog_to_sanity` (dry run) | Validates slug, categories, tags — no write |
| `publish_blog_to_sanity` (live) | Publishes to Sanity as draft; auto-generates a card image |
| `publish_blog_to_hashnode` | Sends to Hashnode as draft (or live with `mode: publish`) |

A human reviews everything in Sanity Studio before it goes live on tessell.com.

---

## Quick Start

```bash
git clone https://github.com/AsutoshTessell/tessell-blog-agent-mcp
cd tessell-blog-agent-mcp
npm install && npm run build

```

---

## Environment Setup

| Variable | How to get it |
| --- | --- |
| `SANITY_PROJECT_ID` | Fixed: `krotrzct` |
| `SANITY_DATASET` | Fixed: `staging` |
| `SANITY_TOKEN` | [sanity.io/manage](https://sanity.io/manage) → Tessell project → **API → Tokens → Add API token** → Editor role |
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) → Tokens (classic) → Generate new token → tick `repo` scope |
| `TESSELL_GITHUB_REPOS` | Comma-separated list of Tessell GitHub repo URLs |
| `HASHNODE_ACCESS_TOKEN` | [hashnode.com](https://hashnode.com) → Account Settings → **Developer → Personal Access Tokens** |
| `HASHNODE_PUBLICATION_HOST` | Your Hashnode blog URL e.g. `yourname.hashnode.dev` |
| `HASHNODE_PUBLICATION_ID` | Run the GraphQL query below at [gql.hashnode.com](https://gql.hashnode.com) |
| `TESSELL_BLOG_CANONICAL_BASE_URL` | **Optional.** Only set if the same post lives on both tessell.com **and** Hashnode. Value: `https://www.tessell.com/blog` |

**Get your `HASHNODE_PUBLICATION_ID`** — go to [gql.hashnode.com](https://gql.hashnode.com) and run:

```graphql
query {
  publication(host: "yourname.hashnode.dev") {
    id
    title
  }
}
```

Copy the `id` from the response — that’s your `HASHNODE_PUBLICATION_ID`.

> Never commit `.env` to Git. It is already in `.gitignore`.

---

## Add to Your AI Assistant

The MCP runs as a local subprocess — your AI assistant spawns it on demand. Point the config at `dist/index.js` in the cloned repo.

**Augment Code** — `Cmd+Shift+P` → Preferences: Open User Settings (JSON) → add:

```json
"augment.advanced": {
  "mcpServers": [
    {
      "name": "tessell-blog-agent",
      "command": "node",
      "args": ["/your/local/path/to/tessell-blog-agent-mcp/dist/index.js"]
    }
  ]
}
```

**Cursor** — create or edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "tessell-blog-agent": {
      "command": "node",
      "args": ["/your/local/path/to/tessell-blog-agent-mcp/dist/index.js"]
    }
  }
}
```

> Replace `/your/local/path/to/tessell-blog-agent-mcp` with the absolute path where you cloned the repo (e.g. `/Users/yourname/projects/tessell-blog-agent-mcp`). Restart your AI assistant after saving.

---

## Example Prompts

```
Generate and publish Tessell blogs from the past 15 days.
```
```
Generate blogs for last month
```

---

## Key Behaviors

- **Draft by default** — every post is `draft: true` in both Sanity and Hashnode until a human approves it
- **Card images auto-generated** — a branded PNG is created from the post title and summary on every Sanity publish
- **Taxonomy fetched live** — categories and tags are pulled from Sanity on each run; no hardcoded values
- **Hashnode is optional** — if Hashnode credentials are missing, Sanity publish still completes normally
- **Canonical URL** — only set `TESSELL_BLOG_CANONICAL_BASE_URL` if the same post exists on both tessell.com and Hashnode; skip it if Hashnode is your only blog
- **No duplicate publishes** — pin `sanityDocumentId` in frontmatter if you want to update an existing post instead of creating a new one

---

## License / Ownership

Internal Tessell tooling; align usage with your team’s Sanity and repo policies.
