import { observable } from "@legendapp/state";
import { useValue } from "@legendapp/state/react";

const settings$ = observable({ theme: "light" });

export const useTheme = () => useValue(() => settings$.theme.get());

export const readThemeOnce = () => settings$.theme.peek();
