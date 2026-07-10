/**
 * Derives the Cloudinary public_id from a secure image URL.
 * Example:
 * URL: "https://res.cloudinary.com/demo/image/upload/v1572912345/sample.jpg"
 * Output: "sample"
 */
function extractCloudinaryPublicId(url) {
  try {
    if (!url || typeof url !== "string") return null;
    const u = new URL(url);
    // Expect path like: /<cloud_name?>/image/upload/v<ver>/<folder>/<name>.<ext>
    const p = u.pathname;
    const idx = p.indexOf("/upload/");
    if (idx === -1) return null;
    let rest = p.substring(idx + "/upload/".length);
    // Drop version prefix if present
    if (rest.startsWith("v") && rest.includes("/")) {
      rest = rest.substring(rest.indexOf("/") + 1);
    }
    // Remove leading slash if any
    if (rest.startsWith("/")) rest = rest.slice(1);
    // Remove extension (last .ext)
    const lastDot = rest.lastIndexOf(".");
    if (lastDot > -1) rest = rest.substring(0, lastDot);
    return rest || null;
  } catch (_) {
    return null;
  }
}

module.exports = {
  extractCloudinaryPublicId
};
