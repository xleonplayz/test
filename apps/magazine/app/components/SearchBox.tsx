"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface SearchBoxProps {
  initialQuery?: string;
  autoFocus?: boolean;
}

export default function SearchBox({
  initialQuery = "",
  autoFocus = false,
}: SearchBoxProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <input
        type="search"
        name="q"
        placeholder="Search the Magazine…"
        aria-label="Search articles"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="btn" type="submit">
        Search
      </button>
    </form>
  );
}
