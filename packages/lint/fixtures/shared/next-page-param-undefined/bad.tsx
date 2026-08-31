import { useInfiniteQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { postKeys } from "@/api/posts/posts.keys";
import { getPosts } from "@/api/posts/posts.requests";

export const PostFeed = () => {
  const { data } = useInfiniteQuery({
    queryKey: postKeys.list(),
    queryFn: getPosts,
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      if (!lastPage.nextCursor) return null;
      return lastPage.nextCursor;
    },
  });
  return <View accessible={data !== undefined} />;
};
