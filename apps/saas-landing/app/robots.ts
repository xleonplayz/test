import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/og"],
    },
    sitemap: "https://columbus.example/sitemap.xml",
  };
}
