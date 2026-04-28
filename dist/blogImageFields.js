function pickString(data, ...keys) {
    for (const k of keys) {
        const v = data[k];
        if (typeof v === 'string' && v.trim())
            return v.trim();
    }
    return '';
}
function imageFromAssetRef(ref) {
    return {
        _type: 'image',
        asset: { _type: 'reference', _ref: ref.trim() },
    };
}
/**
 * Listing cards use `thumbnailImage`; article hero / OG use `mainImage`.
 * Frontmatter keys: thumbnailImageAssetRef, mainImageAssetRef (Sanity image **asset** `_ref`, e.g. image-abc…).
 * Env: TESSELL_DEFAULT_THUMBNAIL_IMAGE_ASSET_REF, TESSELL_DEFAULT_MAIN_IMAGE_ASSET_REF
 * If only one of main/thumb is set, the same asset is used for both so the grid and hero stay in sync.
 */
export function mergeBlogImages(document, frontmatter) {
    const data = frontmatter || {};
    let thumb = pickString(data, 'thumbnailImageAssetRef', 'thumbnail_image_asset_ref', 'thumbnailAssetRef') || process.env.TESSELL_DEFAULT_THUMBNAIL_IMAGE_ASSET_REF?.trim();
    let main = pickString(data, 'mainImageAssetRef', 'main_image_asset_ref', 'mainAssetRef') ||
        process.env.TESSELL_DEFAULT_MAIN_IMAGE_ASSET_REF?.trim();
    if (main && !thumb)
        thumb = main;
    if (thumb && !main)
        main = thumb;
    if (thumb && !document.thumbnailImage) {
        document.thumbnailImage = imageFromAssetRef(thumb);
    }
    if (main && !document.mainImage) {
        document.mainImage = imageFromAssetRef(main);
    }
}
