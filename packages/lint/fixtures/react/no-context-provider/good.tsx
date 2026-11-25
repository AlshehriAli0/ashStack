import { createContext, type ReactNode } from "react";

const ThemeContext = createContext<"light" | "dark">("light");

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext value="dark">{children}</ThemeContext>
);
