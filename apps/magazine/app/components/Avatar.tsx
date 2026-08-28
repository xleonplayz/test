import type { Author } from "@/lib/types";

interface AvatarProps {
  author: Pick<Author, "avatarInitials" | "name">;
  size?: number;
}

export default function Avatar({ author, size = 40 }: AvatarProps) {
  const dimension = `${size}px`;
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: dimension, height: dimension, fontSize: size * 0.36 }}
      title={author.name}
    >
      {author.avatarInitials}
    </span>
  );
}
