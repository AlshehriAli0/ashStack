import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { postKeys } from "@/api/posts/posts.keys";
import { getPosts } from "@/api/posts/posts.requests";

export const PostList = () => {
  const { data } = useQuery({ queryKey: postKeys.list(), queryFn: getPosts });
  return <View accessible={data !== undefined} />;
};
