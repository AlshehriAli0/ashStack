import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postQueries } from "@/api/posts/posts.keys";
import { toggleLike } from "@/api/posts/posts.requests";

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: async ({ id, liked }: { id: string; liked: boolean }) => {
      await queryClient.cancelQueries({ queryKey: postQueries.detail(id).queryKey });
      const previous = queryClient.getQueryData(postQueries.detail(id).queryKey);
      queryClient.setQueryData(postQueries.detail(id).queryKey, post => post && { ...post, liked });
      return { previous };
    },
    onError: (_error, { id }, onMutateResult) => {
      queryClient.setQueryData(postQueries.detail(id).queryKey, onMutateResult?.previous);
    },
    mutationFn: toggleLike,
  });
};
