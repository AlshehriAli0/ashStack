import { observable } from "@legendapp/state";

export const count$ = observable(0);

export const doubled$ = observable(() => count$.get() * 2);
