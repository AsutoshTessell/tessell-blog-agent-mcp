/**
 * Keep in sync with tessell-web/tessell-website/sanity/lib/queries.ts — BLOG_POSTS_QUERY
 * (blog listing page).
 */
export const BLOG_POSTS_QUERY = `
  *[_type == "blogPost" && archived != true && draft != true]
  | order(featured desc, publishedDate desc) {
    _id,
    _createdAt,
    name,
    slug,
    postSummary,
    publishedDate,
    headerFeatured,
    featured,
    thumbnailImage {
      asset->{ url, metadata { dimensions { width, height } } }
    },
    "category": blogCategory->{ name, slug },
    "authorOne": authorOne->{ name, picture { asset->{ url } } },
    "authorTwo": authorTwo->{ name, picture { asset->{ url } } }
  }
`;
