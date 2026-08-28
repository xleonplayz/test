import type { MetadataRoute } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";

const BASE_URL = "https://columbus.example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const tags = getAllTags().map(({ tag }) => ({
    url: `${BASE_URL}/tags/${tag}`,
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/tags`, changeFrequency: "weekly", priority: 0.5 },
    ...posts,
    ...tags,
  ];
}
