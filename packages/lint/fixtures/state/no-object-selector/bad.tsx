import { observable } from "@legendapp/state";
import { useValue } from "@legendapp/state/react";

const settings$ = observable({ theme: "light", locale: "en" });

export const useSettings = () =>
  useValue(() => ({ theme: settings$.theme.get(), locale: settings$.locale.get() }));
