import { useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";

import { postKeys } from "@/api/posts/posts.keys";

export const RefreshPanel = () => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: postKeys.all() });
  return <View onLayout={refresh} />;
};
