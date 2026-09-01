import type { AstNode, RuleContext } from "../../../lib/types.js";

/** Narrow a loosely-typed AST field to a node. */
export const asNode = (value: unknown): AstNode | undefined => (value ?? undefined) as AstNode | undefined;

/** Narrow a loosely-typed AST field to a node list. */
export const asNodes = (value: unknown): AstNode[] => (value as AstNode[] | undefined) ?? [];

export interface Comment {
  type?: string;
  value?: string;
  start: number;
  end: number;
}

export interface Scope {
  upper?: Scope | null;
  through?: { resolved?: { scope?: Scope | null } | null }[];
}

export interface SourceCode {
  text?: string;
  getText?(): string;
  getAllComments?(): Comment[];
  getScope?(node: AstNode): Scope | null | undefined;
}

/** A rule context with the source-code accessors typed. */
export type RnContext = RuleContext & { sourceCode?: SourceCode };
