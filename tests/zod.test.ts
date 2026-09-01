import zod from "../packages/lint/dist/core/rules/zod/index.js";
import { moduleTests } from "./harness.js";

moduleTests(zod, {
  "prefer-enum": {
    valid: [
      "export const s = z.enum(Native);",
      "export const s = z.enum(['a', 'b']);",
      { name: "union with a non-literal member", code: "export const s = z.union([z.literal('a'), z.number()]);" },
      { name: "empty union", code: "export const s = z.union([]);" },
      { name: "not the z namespace", code: "export const s = schema.nativeEnum(Native);" },
      { name: "literals that are not strings", code: "export const s = z.union([z.literal(1), z.literal(2)]);" },
      { name: "union members that are bare calls", code: "export const s = z.union([literal('a'), literal('b')]);" },
      {
        name: "literal calls on another namespace",
        code: "export const s = z.union([other.literal('a'), other.literal('b')]);",
      },
      {
        name: "literal calls taking more than one argument",
        code: "export const s = z.union([z.literal('a', 'b'), z.literal('c', 'd')]);",
      },
      { name: "literal calls taking no argument", code: "export const s = z.union([z.literal(), z.literal()]);" },
      { name: "union argument that is not an array", code: "export const s = z.union(members);" },
      { name: "union with no argument", code: "export const s = z.union();" },
      { name: "computed access on z", code: "export const s = z['nativeEnum'](Native);" },
    ],
    invalid: [
      { code: "export const s = z.nativeEnum(Native);", errors: [{ message: "z.enum()", line: 1, column: 18 }] },
      {
        name: "union of string literals",
        code: "export const s = z.union([z.literal('a'), z.literal('b')]);",
        errors: [{ message: /Replace this union/, line: 1, column: 18 }],
      },
      { name: "single-member literal union", code: "export const s = z.union([z.literal('a')]);", errors: 1 },
    ],
  },
});
