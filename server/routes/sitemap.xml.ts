export default defineEventHandler((event) => {
  const baseURL =
    process.env.GITHUB_REPOSITORY
      ? `https://petri.github.io/${process.env.GITHUB_REPOSITORY.split("/")[1]}`
      : "https://petri.github.io/activity_viewer";

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseURL}/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  event.node.res.setHeader("Content-Type", "application/xml");
  return sitemap;
});

