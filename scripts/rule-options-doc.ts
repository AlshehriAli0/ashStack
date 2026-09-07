import type { OxlintConfig, Rule } from "../packages/lint/dist/lib/types.js";
import { type Schema, tsType } from "./generate-rule-types.js";

/** An entry name paired with the config it returns, in layering order. */
export type EntryConfig = [entry: string, config: OxlintConfig];

/** A markdown table cell: a bare pipe would end the column early. */
export const cell = (text: string): string => text.replaceAll("|", "\\|");

const code = (value: unknown): string => `\`${cell(JSON.stringify(value))}\``;

const TABLE_HEAD = ["| Option | Type | Default | Description |", "| --- | --- | --- | --- |"];

const optionRow = ([name, property]: [string, Schema]): string =>
  `| \`${name}\` | \`${cell(tsType(property))}\` | ${code(property.default)} | ${cell(property.description ?? "")} |`;

/** One property's first `examples` entry, spelled as the config a consumer writes. */
const exampleBlock = ([name, property]: [string, Schema]): string[] => {
  const example: unknown = property.examples?.[0];
  if (example === undefined) return [];
  return [
    `Each \`${name}\` value takes one of these shapes:`,
    "",
    "```jsonc",
    JSON.stringify({ [name]: example }, null, 2),
    "```",
    "",
  ];
};

/**
 * The entries that hand this rule an option, in layering order, skipping one
 * that inherits the entry above it unchanged. Read off the configs, so a
 * tightened cap cannot sit in an entry with nothing in the docs saying so.
 */
export const setBy = (id: string, entries: EntryConfig[]): string[] => {
  const rows: string[] = [];
  let previous: string | undefined;
  for (const [entry, config] of entries) {
    const setting = config.rules?.[id];
    const printed = JSON.stringify(setting);
    if (printed !== previous && Array.isArray(setting) && setting.length > 1) {
      rows.push(`\`${entry}\` → \`${printed}\``);
    }
    previous = printed;
  }
  return rows.length === 0 ? [] : [`Set by: ${rows.join(", ")}`, ""];
};

interface ObjectOption {
  option: Schema;
  properties: [string, Schema][];
}

/** The schema as one object of named options, or null when the options are positional. */
const singleObject = (schema: Schema[]): ObjectOption | null => {
  if (schema.length !== 1) return null;
  const [option] = schema;
  if (option === undefined || option.type !== "object" || option.properties === undefined) return null;
  return { option, properties: Object.entries(option.properties) };
};

/** A positional option as a sentence: a one-row table reads worse than this. */
const scalarLine = (schema: Schema[]): string => {
  const shapes = schema.map(option => `Takes a \`${tsType(option)}\`, default ${code(option.default)}.`).join(" ");
  const [only] = schema;
  const detail = schema.length === 1 && only?.description !== undefined ? ` ${only.description}` : "";
  return `${shapes}${detail}`;
};

/**
 * A rule's **Options** block: the shape as one TypeScript line, then a row per
 * named option carrying its default and what it does. `default` and
 * `description` come off the JSON schema itself, so the rule declares them
 * once and the hover types and these docs read the same source.
 */
export const optionsDoc = (rule: Rule, id: string, entries: EntryConfig[]): string[] => {
  const { schema } = rule.meta;
  if (!Array.isArray(schema) || schema.length === 0) return [];

  const head = ["**Options**", ""];
  const named = singleObject(schema);
  if (named === null) return [...head, scalarLine(schema), "", ...setBy(id, entries)];

  return [
    ...head,
    "```ts",
    `[${tsType(named.option)}]`,
    "```",
    "",
    ...TABLE_HEAD,
    ...named.properties.map(optionRow),
    "",
    ...setBy(id, entries),
    ...named.properties.flatMap(exampleBlock),
  ];
};
