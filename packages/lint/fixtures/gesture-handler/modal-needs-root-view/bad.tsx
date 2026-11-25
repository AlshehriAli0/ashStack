import type { ReactNode } from "react";
import { Modal } from "react-native";
import { GestureDetector, type PanGesture } from "react-native-gesture-handler";

export const Sheet = ({ pan, children }: { pan: PanGesture; children: ReactNode }) => (
  <Modal transparent>
    <GestureDetector gesture={pan}>{children}</GestureDetector>
  </Modal>
);
