import { queryOptions } from "@tanstack/react-query";

import { fetchPost } from "@/api/posts/posts.requests";

export const postQueries = {
  detail: (id: string) => queryOptions({ queryKey: ["posts", "detail", id], queryFn: () => fetchPost(id) }),
};
