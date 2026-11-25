import { useObserve } from "@legendapp/state/react";

import { applyTheme } from "@/lib/theme";
import { settings$ } from "@/stores/settings";

export const useThemeSync = () => {
  useObserve(() => applyTheme(settings$.themeMode.get()));
};
