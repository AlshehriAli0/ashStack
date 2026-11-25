import { useEffect } from "react";
import { AppState } from "react-native";

export const useForeground = (onForeground: () => void) => {
  useEffect(() => {
    AppState.addEventListener("change", state => {
      if (state === "active") onForeground();
    });
  }, [onForeground]);
};
