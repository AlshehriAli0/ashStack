import { observable } from "@legendapp/state";
import { useValue } from "@legendapp/state/react";

const settings$ = observable({ theme: "light", locale: "en" });

export const useTheme = () => useValue(() => settings$.theme.get());

export const useLocale = () => useValue(() => settings$.locale.get());
