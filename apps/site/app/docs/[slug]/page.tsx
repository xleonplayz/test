import { notFound } from "next/navigation";
import { allDocs, getDoc } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return allDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${getDoc(slug)?.title ?? "Not found"} · Leaf & Kettle Docs` };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  return <div dangerouslySetInnerHTML={{ __html: doc.html }} />;
}
