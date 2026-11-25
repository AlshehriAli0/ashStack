import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { createPost } from "@/api/posts/posts.requests";
import { postQueries } from "@/api/posts/posts.keys";

export const useCreatePost = (mutationConfig: UseMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig;
  return useMutation({
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: postQueries.all() });
      onSuccess?.(...args);
    },
    ...rest,
    mutationFn: createPost,
  });
};
