import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { getPosts } from "@/api/posts/posts.requests";

export const PostList = () => {
  const { data } = useQuery({ queryKey: ["posts", "list"], queryFn: getPosts });
  return <View accessible={data !== undefined} />;
};
