import { useSearch } from "@tanstack/react-router";

export const Paged = () => {
  const page = useSearch({ strict: false, select: search => search.page });
  return <span>{String(page)}</span>;
};
