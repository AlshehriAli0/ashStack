import { View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export function Badge() {
  const { theme } = useUnistyles();

  return <View style={{ backgroundColor: theme.colors.accent }} />;
}

export function BadgeList({ ids }: { ids: string[] }) {
  const { theme } = useUnistyles();

  return <>{ids.map(id => <View key={id} style={{ backgroundColor: theme.colors.accent }} />)}</>;
}
