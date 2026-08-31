import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { postKeys } from "@/api/posts/posts.keys";

export const PostList = () => {
  const { data } = useQuery({
    queryKey: postKeys.list(),
    queryFn: () => fetch("/api/posts").then(response => response.json()),
  });
  return <View accessible={data !== undefined} />;
};
