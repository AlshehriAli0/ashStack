import { observable } from "@legendapp/state";
import { useState } from "react";

const count$ = observable(0);

export const useCounter = () => {
  const [count] = useState(count$.get());
  return count;
};
