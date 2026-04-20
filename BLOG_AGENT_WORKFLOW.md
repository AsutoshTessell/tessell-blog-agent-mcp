# Tessell blog agent workflow (MCP)

Use this end-to-end when generating a “what’s new” or similar post from **tessell-ui** and optionally **publishing** to Sanity.

## Steps

1. **`read_tessell_ui_features`**  
   Pass **`repoPath`**: absolute path to the local tessell-ui git repo (e.g. `/path/to/tessell-ui4`). Optional **`daysBack`** (default **14**). Review the `git log` output for notable UI/product changes.

2. **`get_published_blogs`**  
   No arguments. Compare titles/summaries against what you would write so you do not duplicate an existing post.

3. **`save_blog_draft`**  
   Save the Markdown draft: **`title`**, **`markdownContent`** (body + optional YAML frontmatter), **`draftsFolderPath`** (e.g. `/path/to/tessell-blog-agent-mcp/drafts`). Or write the file manually with a dated filename.

4. **`markdown_to_sanity_blog`**  
   Pass **`markdownFilePath`** (absolute path to the `.md` file). Use the returned **`apiReady`** / **`studioFriendly`** JSON (or save the JSON next to the draft as `*.sanity-payloads.json` for reuse).  
   If frontmatter omits **`draft`**, the generated document defaults to **`draft: true`** in Sanity (not on the public blog until you set **`draft: false`** and publish in Studio). Set **`draft: false`** in frontmatter when you intend a live post.

5. **`publish_blog_to_sanity`** (optional — writes to the CMS)  
   Requires **`SANITY_TOKEN`** with **write** access and **`SANITY_PROJECT_ID`** / **`SANITY_DATASET`** in `.env` (see `.env.example`).  
   Provide **exactly one** of:
   - **`markdownFilePath`** — same draft `.md` (converts and posts), or  
   - **`sanityPayloadsJsonPath`** — path to a saved `*.sanity-payloads.json` from step 4, or  
   - **`documentJson`** — stringified `apiReady.document`.  
   Use **`dryRun: true`** first to validate resolution without calling Sanity.  
   After a successful write, open **Sanity Studio** to attach **category, tags, authors, images** if your schema requires them.

## Reply expectations

Summarize **what changed in the UI** (from git), **what was missing from existing blogs**, where the **draft file** lives, and whether **`markdown_to_sanity_blog`** / **`publish_blog_to_sanity`** outputs were produced (including **`dryRun`** when testing).

---

## Sample prompt (copy-paste)

Paste this into Cursor (or any agent with this MCP) to run the full loop in one go:

```
Check the tessell-ui repository for new features from roughly the last two weeks (using the MCP tool that reads the git history with the right repo path and about 14 days). Compare what you find against our published blogs by pulling the live list from Sanity with the get-published-blogs tool. Write a new Markdown blog post for anything important that isn’t already covered, and save the draft under /Users/asutoshbhere/tessell-blog-agent-mcp/drafts using the save-draft tool. After the draft file exists, run the markdown-to-Sanity-blog tool on that file so you also get the API-ready JSON and the studio-friendly copy-paste version in one go. Optionally use publish_blog_to_sanity to write the post into Sanity: prefer dryRun true first, then run with markdownFilePath or sanityPayloadsJsonPath and a write-capable SANITY_TOKEN in .env; after a real write, note that Studio may still need category, tags, authors, and images. Mention draft path, conversion outputs, publish result (or dry-run), and a short summary of what changed in the UI and what was missing from the blog.
```

Adjust the **drafts path** if your machine uses a different folder.
