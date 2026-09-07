/** The publishable packages, by the directory they live in under `packages/`. */
const DIRS = ["lint", "fmt"] as const;

export type Dir = (typeof DIRS)[number];

export const npmName = (dir: Dir): string => `@ashstack/${dir}`;

/** The packages a release asks for, where `both` means every one of them. */
export const requestedDirs = (requested: string): Dir[] => {
  const asked = requested.split(",");
  return DIRS.filter(dir => asked.includes("both") || asked.includes(dir));
};
