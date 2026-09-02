import { useLocation, useSearch } from "@tanstack/react-router";

export const Crumb = () => {
  const location = useLocation();
  return <span>{location.pathname}</span>;
};

export const Filters = () => {
  const search = useSearch({ strict: false });
  return <span>{String(search)}</span>;
};
