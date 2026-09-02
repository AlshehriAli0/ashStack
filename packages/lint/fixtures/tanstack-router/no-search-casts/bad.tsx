import { useRouter, useSearch } from "@tanstack/react-router";

interface Query {
  page: number;
}

export const Paged = () => {
  const search = useSearch({ strict: false }) as Query;
  return <span>{search.page}</span>;
};

export const Raw = () => {
  const router = useRouter();
  const query = router.state.location.search as Query;
  return <span>{query.page}</span>;
};
