import { queryOptions } from "@tanstack/react-query";

import { fetchPosts } from "@/api/posts/posts.requests";

export const postQueries = {
  all: () => ["posts"] as const,
  list: (page: number) =>
    queryOptions({ queryKey: [...postQueries.all(), "list", page], queryFn: ({ signal }) => fetchPosts(page, signal) }),
};
