import { scheduleOnUI } from "react-native-worklets";

declare function foo(first: number, second: number): void;

export function schedule(first: number, second: number) {
  scheduleOnUI(() => {
    "worklet";
    foo(first, second);
  });
}
