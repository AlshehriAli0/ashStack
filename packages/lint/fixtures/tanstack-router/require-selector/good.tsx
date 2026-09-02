import { useLocation, useSearch } from "@tanstack/react-router";

export const Crumb = () => {
  const pathname = useLocation({ select: location => location.pathname });
  return <span>{pathname}</span>;
};

export const Filters = () => {
  const page = useSearch({ strict: false, select: search => search.page });
  return <span>{String(page)}</span>;
};
