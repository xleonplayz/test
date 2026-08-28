import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles";
import { AUTHORS } from "@/lib/authors";
import { SECTIONS } from "@/lib/sections";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/search"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    },
  ];

  const sectionRoutes: MetadataRoute.Sitemap = SECTIONS.map((s) => ({
    url: absoluteUrl(`/section/${s.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const authorRoutes: MetadataRoute.Sitemap = AUTHORS.map((a) => ({
    url: absoluteUrl(`/author/${a.id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/article/${article.slug}`),
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
    changeFrequency: "weekly",
    priority: article.status === "featured" ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...sectionRoutes, ...authorRoutes, ...articleRoutes];
}
