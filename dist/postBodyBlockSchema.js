/**
 * Minimal block schema for blog `postBody` (block + standard styles/lists/marks).
 * Matches tessell-web `blogPost.postBody` enough for `htmlToBlocks` from Markdown→HTML.
 */
export const POST_BODY_BLOCK_CONTENT = {
    type: 'array',
    name: 'postBody',
    title: 'Post Body',
    of: [
        {
            type: 'block',
            styles: [
                { title: 'Normal', value: 'normal' },
                { title: 'H1', value: 'h1' },
                { title: 'H2', value: 'h2' },
                { title: 'H3', value: 'h3' },
                { title: 'H4', value: 'h4' },
                { title: 'Quote', value: 'blockquote' },
            ],
            lists: [
                { title: 'Bullet', value: 'bullet' },
                { title: 'Number', value: 'number' },
            ],
            marks: {
                decorators: [
                    { title: 'Strong', value: 'strong' },
                    { title: 'Emphasis', value: 'em' },
                    { title: 'Code', value: 'code' },
                ],
                annotations: [
                    {
                        name: 'link',
                        type: 'object',
                        title: 'Link',
                        fields: [
                            {
                                title: 'URL',
                                name: 'href',
                                type: 'url',
                            },
                        ],
                    },
                ],
            },
        },
    ],
};
