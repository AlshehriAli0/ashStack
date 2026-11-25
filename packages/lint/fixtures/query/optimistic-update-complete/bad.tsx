import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postQueries } from "@/api/posts/posts.keys";
import { toggleLike } from "@/api/posts/posts.requests";

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: ({ id, liked }: { id: string; liked: boolean }) => {
      queryClient.setQueryData(postQueries.detail(id).queryKey, post => post && { ...post, liked });
    },
    mutationFn: toggleLike,
  });
};
