import { createClient } from '@sanity/client';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import type { ApiReadyBlogDocument } from './markdownToSanityBlog.js';
import { markdownToSanityBlogPayloads } from './markdownToSanityBlog.js';

export type PublishBlogSource = {
  markdownFilePath?: string;
  sanityPayloadsJsonPath?: string;
  /** Raw JSON string of a full `blogPost` document (e.g. from apiReady.document) */
  documentJson?: string;
};

function isBlogPostDoc(x: unknown): x is ApiReadyBlogDocument {
  return (
    typeof x === 'object' &&
    x !== null &&
    (x as { _type?: string })._type === 'blogPost' &&
    typeof (x as { name?: unknown }).name === 'string'
  );
}

/**
 * Resolve a single `blogPost` document from one of: markdown file, saved payloads JSON, or raw JSON string.
 */
export async function resolveBlogPostDocument(source: PublishBlogSource): Promise<ApiReadyBlogDocument> {
  const md = source.markdownFilePath?.trim();
  const payloads = source.sanityPayloadsJsonPath?.trim();
  const rawJson = source.documentJson?.trim();

  const provided = [md, payloads, rawJson].filter(Boolean).length;
  if (provided !== 1) {
    throw new Error('Provide exactly one of: markdownFilePath, sanityPayloadsJsonPath, or documentJson');
  }

  if (md) {
    const { apiReady } = await markdownToSanityBlogPayloads({ markdownFilePath: md });
    return apiReady.document;
  }

  if (payloads) {
    const text = await readFile(payloads, 'utf-8');
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const fromApiReady = parsed.apiReady as { document?: unknown } | undefined;
    if (fromApiReady?.document && isBlogPostDoc(fromApiReady.document)) {
      return fromApiReady.document;
    }
    if (isBlogPostDoc(parsed)) {
      return parsed;
    }
    throw new Error(
      'sanityPayloadsJsonPath: expected `apiReady.document` with _type blogPost, or a root blogPost document'
    );
  }

  const doc = JSON.parse(rawJson!) as unknown;
  if (!isBlogPostDoc(doc)) {
    throw new Error('documentJson must parse to an object with _type "blogPost" and a string name');
  }
  return doc;
}

export type PublishBlogPostResult = {
  ok: true;
  dryRun: boolean;
  projectId: string;
  dataset: string;
  documentId: string;
  slug: string | undefined;
  sanityResponse?: unknown;
};

/**
 * Writes a blog post document to Sanity via `createOrReplace` (mutations API).
 * Requires `SANITY_TOKEN` with write access (Editor token or similar).
 */
export async function publishBlogPostToSanity(
  document: ApiReadyBlogDocument,
  options?: { dataset?: string; dryRun?: boolean }
): Promise<PublishBlogPostResult> {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = options?.dataset ?? process.env.SANITY_DATASET ?? 'staging';
  const token = process.env.SANITY_TOKEN;

  if (!projectId) {
    throw new Error('SANITY_PROJECT_ID is missing (load .env or set env).');
  }

  const slugCurrent =
    document.slug && typeof document.slug === 'object' && 'current' in document.slug
      ? (document.slug as { current?: string }).current
      : undefined;

  const documentId = document._id ?? '(missing _id)';

  if (options?.dryRun) {
    return {
      ok: true,
      dryRun: true,
      projectId,
      dataset,
      documentId: String(documentId),
      slug: slugCurrent,
    };
  }

  if (!token) {
    throw new Error(
      'SANITY_TOKEN is required for mutations. Use a write-capable token (not read-only). See .env.example.'
    );
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: false,
    token,
  });

  const docWithId = { ...document, _id: document._id ?? randomUUID() };
  const sanityResponse = await client.mutate([{ createOrReplace: docWithId as any }]);

  return {
    ok: true,
    dryRun: false,
    projectId,
    dataset,
    documentId: String(document._id ?? ''),
    slug: slugCurrent,
    sanityResponse,
  };
}
