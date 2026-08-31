import { observable } from "@legendapp/state";

const settings$ = observable({ theme: "light", count: 0 });

export const applyDark = () => {
  settings$.theme = "dark";
};

export const bump = () => {
  settings$.count++;
};
