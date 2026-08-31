import { Pressable } from "react-native-gesture-handler";
import { StarIcon } from "./icons";

export function GoodIconButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Add to favourites" onPress={onPress}>
      <StarIcon />
    </Pressable>
  );
}
