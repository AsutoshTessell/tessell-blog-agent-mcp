/**
 * Keep in sync with cms/schemaTypes: blogCategory, blogTag
 * Only lists documents that are usable in Studio (not archived/draft category & tag docs).
 */
export const BLOG_CATEGORIES_QUERY = `
  *[_type == "blogCategory" && archived != true && draft != true]
  | order(coalesce(order, 999) asc, name asc) {
    _id,
    name,
    "slug": slug.current
  }
`;
export const BLOG_TAGS_QUERY = `
  *[_type == "blogTag" && archived != true && draft != true]
  | order(name asc) {
    _id,
    name,
    "slug": slug.current
  }
`;
