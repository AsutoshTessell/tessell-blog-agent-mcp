import { randomUUID } from 'crypto';
import { Lexer, type Token, type Tokens } from 'marked';

function key() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

/** Minimal Portable Text block shape for Sanity `postBody` (block type only). */
export type PtBlock = {
  _type: 'block';
  _key: string;
  style: string;
  markDefs: Array<{ _key: string; _type: string; href?: string }>;
  children: Array<{
    _type: 'span';
    _key: string;
    text: string;
    marks: string[];
  }>;
  listItem?: 'bullet' | 'number';
  level?: number;
};

function span(text: string, marks: string[]): PtBlock['children'][0] {
  return { _type: 'span', _key: key(), text, marks };
}

function inlineToSpans(
  tokens: Token[] | undefined,
  markDefs: PtBlock['markDefs'],
  activeMarks: string[] = []
): PtBlock['children'] {
  if (!tokens?.length) return [span('', activeMarks)];

  const out: PtBlock['children'] = [];

  for (const t of tokens) {
    if (t.type === 'text') {
      out.push(span((t as Tokens.Text).text, activeMarks));
    } else if (t.type === 'strong') {
      const st = t as Tokens.Strong;
      out.push(...inlineToSpans(st.tokens, markDefs, [...activeMarks, 'strong']));
    } else if (t.type === 'em') {
      const em = t as Tokens.Em;
      out.push(...inlineToSpans(em.tokens, markDefs, [...activeMarks, 'em']));
    } else if (t.type === 'codespan') {
      out.push(span((t as Tokens.Codespan).text, [...activeMarks, 'code']));
    } else if (t.type === 'link') {
      const lk = t as Tokens.Link;
      const ref = key();
      markDefs.push({ _key: ref, _type: 'link', href: lk.href });
      out.push(...inlineToSpans(lk.tokens, markDefs, [...activeMarks, ref]));
    } else if (t.type === 'br') {
      out.push(span('\n', activeMarks));
    } else if (t.type === 'del') {
      out.push(...inlineToSpans((t as Tokens.Del).tokens, markDefs, activeMarks));
    } else {
      const any = t as { text?: string };
      if (any.text) out.push(span(any.text, activeMarks));
    }
  }

  return out.length ? out : [span('', activeMarks)];
}

function makeBlock(
  style: string,
  children: PtBlock['children'],
  markDefs: PtBlock['markDefs'],
  list?: { item: 'bullet' | 'number'; level: number }
): PtBlock {
  const b: PtBlock = {
    _type: 'block',
    _key: key(),
    style,
    markDefs,
    children,
  };
  if (list) {
    b.listItem = list.item;
    b.level = list.level;
  }
  return b;
}

function walkList(list: Tokens.List, level: number, blocks: PtBlock[]) {
  const itemType: 'bullet' | 'number' = list.ordered ? 'number' : 'bullet';
  for (const item of list.items) {
    const md: PtBlock['markDefs'] = [];
    const children = inlineToSpans(item.tokens, md);
    blocks.push(
      makeBlock('normal', children, md, {
        item: itemType,
        level: level + 1,
      })
    );
    for (const nested of item.tokens || []) {
      if (nested.type === 'list') {
        walkList(nested as Tokens.List, level + 1, blocks);
      }
    }
  }
}

/**
 * Markdown → Portable Text blocks (headings, paragraphs, lists, blockquote, fenced code; inline strong/em/code/links).
 * Images and GFM tables are not mapped to Sanity image/table types (add manually in Studio or extend later).
 */
export function markdownToPortableTextBlocks(markdown: string): PtBlock[] {
  const blocks: PtBlock[] = [];
  const tokens = Lexer.lex(markdown.trim() || '');

  for (const token of tokens) {
    if (token.type === 'heading') {
      const h = token as Tokens.Heading;
      const md: PtBlock['markDefs'] = [];
      const style = h.depth >= 1 && h.depth <= 4 ? `h${h.depth}` : 'h2';
      blocks.push(makeBlock(style, inlineToSpans(h.tokens, md), md));
    } else if (token.type === 'paragraph') {
      const p = token as Tokens.Paragraph;
      const md: PtBlock['markDefs'] = [];
      blocks.push(makeBlock('normal', inlineToSpans(p.tokens, md), md));
    } else if (token.type === 'list') {
      walkList(token as Tokens.List, 0, blocks);
    } else if (token.type === 'blockquote') {
      const bq = token as Tokens.Blockquote;
      for (const inner of bq.tokens || []) {
        if (inner.type === 'paragraph') {
          const md: PtBlock['markDefs'] = [];
          blocks.push(
            makeBlock('blockquote', inlineToSpans((inner as Tokens.Paragraph).tokens, md), md)
          );
        }
      }
    } else if (token.type === 'code') {
      const c = token as Tokens.Code;
      const md: PtBlock['markDefs'] = [];
      blocks.push(makeBlock('normal', [span(c.text, ['code'])], md));
    } else if (token.type === 'space') {
      continue;
    } else if (token.type === 'hr') {
      const md: PtBlock['markDefs'] = [];
      blocks.push(makeBlock('normal', [span(' ', [])], md));
    }
  }

  if (blocks.length === 0) {
    const md: PtBlock['markDefs'] = [];
    blocks.push(makeBlock('normal', [span('', [])], md));
  }

  return blocks;
}
