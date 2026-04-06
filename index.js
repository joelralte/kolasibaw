// Web bootstrap helper for Kolasib AW.
// Add custom browser-side initialization here if needed.
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toSafeText(value, fallback) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text.length > 0 ? text : fallback;
}

function shorten(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function normalizeAbsoluteUrl(candidate, baseOrigin) {
  const fallback = `${baseOrigin}/icons/Icon-512.png`;
  if (typeof candidate !== "string") return fallback;
  const value = candidate.trim();
  if (!value) return fallback;

  try {
    return new URL(value, `${baseOrigin}/`).toString();
  } catch {
    return fallback;
  }
}

exports.ogDetails = onRequest({ region: "us-central1" }, async (req, res) => {
  try {
    const path = req.path || "";
    const match = path.match(/^\/(details|detail|detailpage)\/([^/]+)\/?$/);
    const id = match ? decodeURIComponent(match[2]) : "";

    const host = req.get("host") || "kolasibaw.in";
    const proto = req.get("x-forwarded-proto") || "https";
    const canonicalPath = id ? `/details/${encodeURIComponent(id)}` : "/";
    const canonicalUrl = `${proto}://${host}${canonicalPath}`;

    let title = "Kolasib AW";
    let description = "Latest Mizoram news, stories, and updates from Kolasib AW.";
    const baseOrigin = `${proto}://${host}`;
    let imageUrl = `${baseOrigin}/icons/Icon-512.png`;

    if (id) {
      const doc = await admin.firestore().collection("post").doc(id).get();
      if (doc.exists) {
        const data = doc.data() || {};
        title = toSafeText(data.title, title);
        description = toSafeText(data.content, description);
        imageUrl = normalizeAbsoluteUrl(data.imageUrl, baseOrigin);
      }
    }

    description = shorten(description, 220);

    const html = `<!DOCTYPE html>
<html>
<head>
  <base href="/">
  <meta charset="UTF-8">
  <meta content="IE=Edge" http-equiv="X-UA-Compatible">
  <meta name="description" content="${escapeHtml(description)}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Kolasib AW">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta property="article:publisher" content="https://kolasibaw.in/">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="jozo">
  <link rel="apple-touch-icon" href="/icons/Icon-192.png">
  <link rel="icon" type="image/png" href="/favicon.png"/>
  <title>${escapeHtml(title)}</title>
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <script src="/flutter_bootstrap.js" async></script>
</body>
</html>`;

    res.set("Cache-Control", "public, max-age=120, s-maxage=300");
    res.status(200).send(html);
  } catch (error) {
    console.error("Failed to render OG page", error);
    res.status(500).send("Internal Server Error");
  }
});
