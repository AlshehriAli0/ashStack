import { observable } from "@legendapp/state";

const settings$ = observable({ theme: "light", count: 0 });

export const applyDark = () => {
  settings$.theme.set("dark");
};

export const bump = () => {
  settings$.count.set(value => value + 1);
};
