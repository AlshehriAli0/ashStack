import { Pressable } from "react-native-gesture-handler";
import { StarIcon } from "./icons";

export function BadIconButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <StarIcon />
    </Pressable>
  );
}
