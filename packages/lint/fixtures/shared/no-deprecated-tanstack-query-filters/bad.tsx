import { useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";

export const RefreshPanel = () => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries(["posts"]);
  return <View onLayout={refresh} />;
};
