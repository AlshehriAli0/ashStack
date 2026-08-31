import { View } from "react-native";

import { usePostsQuery } from "@/api/posts/posts.queries";

export const PostList = () => {
  const { isSuccess } = usePostsQuery();
  return <View accessible={isSuccess} />;
};
