import { observable } from "@legendapp/state";
import { useValue } from "@legendapp/state/react";

const count$ = observable(0);

export const useCounter = () => useValue(count$);
