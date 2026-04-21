import sharp from 'sharp';
import type { SanityClient } from '@sanity/client';
import type { ApiReadyBlogDocument } from './markdownToSanityBlog.js';
import type { SanityImageField } from './blogImageFields.js';

const W = 1200;
const H = 630;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Word-wrap to fit card */
function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  let remaining = (text.trim() || 'Blog post').replace(/\s+/g, ' ');
  const lines: string[] = [];
  while (remaining && lines.length < maxLines) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    let breakAt = remaining.lastIndexOf(' ', maxCharsPerLine);
    if (breakAt <= 0) breakAt = maxCharsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return lines.length ? lines : ['Blog post'];
}

/**
 * Renders a simple branded PNG (title + optional subtitle from postSummary) for blog grid + hero.
 */
export async function generateBlogCardPng(options: {
  title: string;
  subtitle?: string;
}): Promise<Buffer> {
  const titleLines = wrapLines(options.title, 36, 4);
  const sub = options.subtitle?.trim();
  const subLines = sub ? wrapLines(sub, 70, 3) : [];

  const titleBlock = titleLines
    .map((line, i) => {
      const y = 160 + i * 56;
      return `<text x="60" y="${y}" font-size="44" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="600">${escapeXml(line)}</text>`;
    })
    .join('\n');

  const subBlock = subLines
    .map((line, i) => {
      const y = 160 + titleLines.length * 56 + 40 + i * 32;
      return `<text x="60" y="${y}" font-size="22" fill="#b8d4e8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${escapeXml(line)}</text>`;
    })
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a6f8f"/>
      <stop offset="100%" style="stop-color:#0a2840"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="60" y="95" font-size="20" fill="#7ec8e1" font-family="system-ui, sans-serif" letter-spacing="0.08em">TESSELL</text>
  ${titleBlock}
  ${subBlock}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function imageFieldFromAssetId(id: string): SanityImageField {
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: id },
  };
}

/**
 * Uploads a generated PNG and sets thumbnail + main image on the document (same asset).
 * Skips if `thumbnailImage` is already set.
 */
export async function tryGenerateAndUploadBlogCardImage(
  client: SanityClient,
  document: ApiReadyBlogDocument,
  slugHint: string
): Promise<{ assetId: string } | null> {
  if (document.thumbnailImage?.asset?._ref) {
    return null;
  }

  const png = await generateBlogCardPng({
    title: document.name,
    subtitle: document.postSummary,
  });

  const safeSlug = slugHint.replace(/[^a-z0-9._-]/gi, '-').slice(0, 80) || 'post';
  const uploaded = await client.assets.upload('image', png, {
    filename: `blog-card-${safeSlug}.png`,
    contentType: 'image/png',
  });

  const id = uploaded._id;
  document.thumbnailImage = imageFieldFromAssetId(id);
  document.mainImage = imageFieldFromAssetId(id);

  return { assetId: id };
}
