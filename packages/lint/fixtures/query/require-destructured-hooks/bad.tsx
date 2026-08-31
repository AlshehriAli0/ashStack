import { View } from "react-native";

import { usePostsQuery } from "@/api/posts/posts.queries";

export const PostList = () => {
  const posts = usePostsQuery();
  return <View accessible={posts.isSuccess} />;
};
