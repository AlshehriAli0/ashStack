/** A prop that carries classes: `class`, `className`, or a named slot like `wrapperClassName`. */
export const CLASS_ATTRIBUTE = /^(?:class|className|[A-Za-z_$][A-Za-z0-9_$]*ClassName)$/;

/** A binding whose name says it holds classes: `chipClasses`, `buttonClassName`, `rowStyles`. */
export const CLASS_BINDING = /^[A-Za-z_$][A-Za-z0-9_$]*(?:class(?:es|name|names)?|styles?)$/i;

/** Files without either word hold no class value these rules can read. */
export const CLASS_MARKER = /class|style/i;

export const KNOWN_COMPOSERS = new Set(["cn", "clsx", "classNames", "classnames", "twMerge"]);
export const COMPOSER_MODULES = ["clsx", "classnames", "tailwind-merge"];
