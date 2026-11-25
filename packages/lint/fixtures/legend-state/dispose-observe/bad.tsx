import { observe } from "@legendapp/state";
import { useEffect } from "react";

import { applyTheme } from "@/lib/theme";
import { settings$ } from "@/stores/settings";

export const useThemeSync = () => {
  useEffect(() => {
    observe(() => applyTheme(settings$.themeMode.get()));
  }, []);
};
