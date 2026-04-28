/**
 * BLOG_POSTS_QUERY — align with your Sanity schema / site GROQ if you evolve the blogPost type.
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
