import { randomUUID } from 'crypto';
import { Lexer } from 'marked';
function key() {
    return randomUUID().replace(/-/g, '').slice(0, 12);
}
function span(text, marks) {
    return { _type: 'span', _key: key(), text, marks };
}
function inlineToSpans(tokens, markDefs, activeMarks = []) {
    if (!tokens?.length)
        return [span('', activeMarks)];
    const out = [];
    for (const t of tokens) {
        if (t.type === 'text') {
            out.push(span(t.text, activeMarks));
        }
        else if (t.type === 'strong') {
            const st = t;
            out.push(...inlineToSpans(st.tokens, markDefs, [...activeMarks, 'strong']));
        }
        else if (t.type === 'em') {
            const em = t;
            out.push(...inlineToSpans(em.tokens, markDefs, [...activeMarks, 'em']));
        }
        else if (t.type === 'codespan') {
            out.push(span(t.text, [...activeMarks, 'code']));
        }
        else if (t.type === 'link') {
            const lk = t;
            const ref = key();
            markDefs.push({ _key: ref, _type: 'link', href: lk.href });
            out.push(...inlineToSpans(lk.tokens, markDefs, [...activeMarks, ref]));
        }
        else if (t.type === 'br') {
            out.push(span('\n', activeMarks));
        }
        else if (t.type === 'del') {
            out.push(...inlineToSpans(t.tokens, markDefs, activeMarks));
        }
        else {
            const any = t;
            if (any.text)
                out.push(span(any.text, activeMarks));
        }
    }
    return out.length ? out : [span('', activeMarks)];
}
function makeBlock(style, children, markDefs, list) {
    const b = {
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
function walkList(list, level, blocks) {
    const itemType = list.ordered ? 'number' : 'bullet';
    for (const item of list.items) {
        const md = [];
        const children = inlineToSpans(item.tokens, md);
        blocks.push(makeBlock('normal', children, md, {
            item: itemType,
            level: level + 1,
        }));
        for (const nested of item.tokens || []) {
            if (nested.type === 'list') {
                walkList(nested, level + 1, blocks);
            }
        }
    }
}
/**
 * Markdown → Portable Text blocks (headings, paragraphs, lists, blockquote, fenced code; inline strong/em/code/links).
 * Images and GFM tables are not mapped to Sanity image/table types (add manually in Studio or extend later).
 */
export function markdownToPortableTextBlocks(markdown) {
    const blocks = [];
    const tokens = Lexer.lex(markdown.trim() || '');
    for (const token of tokens) {
        if (token.type === 'heading') {
            const h = token;
            const md = [];
            const style = h.depth >= 1 && h.depth <= 4 ? `h${h.depth}` : 'h2';
            blocks.push(makeBlock(style, inlineToSpans(h.tokens, md), md));
        }
        else if (token.type === 'paragraph') {
            const p = token;
            const md = [];
            blocks.push(makeBlock('normal', inlineToSpans(p.tokens, md), md));
        }
        else if (token.type === 'list') {
            walkList(token, 0, blocks);
        }
        else if (token.type === 'blockquote') {
            const bq = token;
            for (const inner of bq.tokens || []) {
                if (inner.type === 'paragraph') {
                    const md = [];
                    blocks.push(makeBlock('blockquote', inlineToSpans(inner.tokens, md), md));
                }
            }
        }
        else if (token.type === 'code') {
            const c = token;
            const md = [];
            blocks.push(makeBlock('normal', [span(c.text, ['code'])], md));
        }
        else if (token.type === 'space') {
            continue;
        }
        else if (token.type === 'hr') {
            const md = [];
            blocks.push(makeBlock('normal', [span(' ', [])], md));
        }
    }
    if (blocks.length === 0) {
        const md = [];
        blocks.push(makeBlock('normal', [span('', [])], md));
    }
    return blocks;
}
