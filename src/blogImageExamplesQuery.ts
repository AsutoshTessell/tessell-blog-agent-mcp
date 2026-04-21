/** Recent posts that already have thumbnails — copy `thumbnailAssetRef` into frontmatter or .env. */
export const BLOG_IMAGE_EXAMPLES_QUERY = `
  *[_type == "blogPost" && defined(thumbnailImage.asset._ref)]
  | order(publishedDate desc) [0...15] {
    name,
    "slug": slug.current,
    "thumbnailAssetRef": thumbnailImage.asset._ref,
    "mainAssetRef": mainImage.asset._ref
  }
`;
