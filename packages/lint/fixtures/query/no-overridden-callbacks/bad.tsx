import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { createPost } from "@/api/posts/posts.requests";
import { postQueries } from "@/api/posts/posts.keys";

export const useCreatePost = (mutationConfig: UseMutationOptions = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postQueries.all() }),
    ...mutationConfig,
  });
};
