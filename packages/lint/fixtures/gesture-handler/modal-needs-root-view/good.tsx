import type { ReactNode } from "react";
import { Modal } from "react-native";
import { GestureDetector, GestureHandlerRootView, type PanGesture } from "react-native-gesture-handler";

export const Sheet = ({ pan, children }: { pan: PanGesture; children: ReactNode }) => (
  <Modal transparent>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={pan}>{children}</GestureDetector>
    </GestureHandlerRootView>
  </Modal>
);
