import type { Author } from "@/lib/types";

export const AUTHORS: readonly Author[] = [
  {
    id: "m-okonkwo",
    name: "Maya Okonkwo",
    role: "Senior World Correspondent",
    bio: "Maya has filed dispatches from four continents and covers diplomacy, migration and conflict for the Magazine.",
    avatarInitials: "MO",
    twitter: "mayaokonkwo",
  },
  {
    id: "j-reyes",
    name: "Julian Reyes",
    role: "Technology Editor",
    bio: "Julian writes about computing, open source and the strange economics of the software industry.",
    avatarInitials: "JR",
    twitter: "julianreyes",
  },
  {
    id: "a-fischer",
    name: "Anna Fischer",
    role: "Markets Reporter",
    bio: "Anna tracks central banks, supply chains and the companies trying to outrun them.",
    avatarInitials: "AF",
  },
  {
    id: "t-nakamura",
    name: "Toshi Nakamura",
    role: "Science Correspondent",
    bio: "Toshi reports on climate, physics and the institutions that fund discovery.",
    avatarInitials: "TN",
    twitter: "toshinakamura",
  },
  {
    id: "l-mbeki",
    name: "Lerato Mbeki",
    role: "Culture Critic",
    bio: "Lerato reviews film and books and occasionally loses arguments about both in public.",
    avatarInitials: "LM",
  },
  {
    id: "editorial-board",
    name: "The Editorial Board",
    role: "Opinion",
    bio: "The unsigned voice of the Magazine on the questions of the day.",
    avatarInitials: "EB",
  },
] as const;

const BY_ID: ReadonlyMap<string, Author> = new Map(
  AUTHORS.map((a) => [a.id, a]),
);

export function getAuthor(id: string): Author | undefined {
  return BY_ID.get(id);
}

export function requireAuthor(id: string): Author {
  const found = BY_ID.get(id);
  if (!found) {
    // Fall back to a synthetic author rather than crashing the render.
    return {
      id,
      name: "Staff Writer",
      role: "Contributor",
      bio: "Reporting for the Magazine.",
      avatarInitials: "SW",
    };
  }
  return found;
}
