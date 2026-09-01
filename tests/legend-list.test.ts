import legendList from "../packages/lint/dist/react-native/rules/legend-list/index.js";
import { moduleTests } from "./harness.js";

const IMPORT = "import { LegendList } from '@legendapp/list/react-native';";

moduleTests(legendList, {
  "required-props": {
    valid: [
      {
        name: "both required props present",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={item => item.id} recycleItems renderItem={({ item }) => <Row item={item} />} />
);
`,
      },
      {
        name: "recycleItems explicitly false still counts as present",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={item => item.id} recycleItems={false} renderItem={r} />
);
`,
      },
      {
        name: "a spread suppresses both reports",
        code: `
${IMPORT}

export const Feed = ({ rows, listProps }) => <LegendList data={rows} {...listProps} />;
`,
      },
      {
        name: "a spread suppresses the one remaining report",
        code: `
${IMPORT}

export const Feed = ({ rows, listProps }) => <LegendList {...listProps} recycleItems />;
`,
      },
      {
        name: "a spread after the named props still suppresses",
        code: `
${IMPORT}

export const Feed = ({ rows, listProps }) => <LegendList data={rows} keyExtractor={k} {...listProps} />;
`,
      },
      {
        name: "not a Legend List at all",
        code: `
${IMPORT}
import { FlatList } from 'react-native';

export const Feed = ({ rows }) => <FlatList data={rows} renderItem={r} />;
`,
      },
      {
        name: "tag contains LegendList but does not end with it",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendListSection data={rows} />;
`,
      },
      {
        name: "member tag whose last segment is LegendList and has both props",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <Animated.LegendList data={rows} keyExtractor={k} recycleItems />;
`,
      },
    ],
    invalid: [
      {
        name: "both missing reports twice on the opening element",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} renderItem={({ item }) => <Row item={item} />} />;
`,
        errors: [
          { message: "Add `keyExtractor={item => item.id}`", line: 4, column: 35 },
          { message: "Add `recycleItems={true}`", line: 4, column: 35 },
        ],
      },
      {
        name: "only keyExtractor missing",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} recycleItems renderItem={r} />;
`,
        errors: [{ message: "Add `keyExtractor={item => item.id}`", line: 4, column: 35 }],
      },
      {
        name: "only recycleItems missing",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={item => item.id} renderItem={r} />;
`,
        errors: [{ message: "Add `recycleItems={true}`", line: 4, column: 35 }],
      },
      {
        name: "a wrapper whose name ends with LegendList is treated as a list",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <AnimatedLegendList data={rows} />;
`,
        errors: 2,
      },
      {
        name: "member tag whose last segment is LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <Animated.LegendList data={rows} />;
`,
        errors: 2,
      },
      {
        name: "two lists in one file report independently",
        code: `
${IMPORT}

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned} recycleItems renderItem={r} />
    <LegendList data={rows} keyExtractor={item => item.id} renderItem={r} />
  </>
);
`,
        errors: [
          { message: "Add `keyExtractor={item => item.id}`", line: 6 },
          { message: "Add `recycleItems={true}`", line: 7 },
        ],
      },
    ],
  },

  "no-index-key-extractor": {
    valid: [
      {
        name: "stable id, index parameter absent",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} recycleItems keyExtractor={item => item.id} />;
`,
      },
      {
        name: "index parameter declared but unused",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, index) => item.id} />
);
`,
      },
      {
        name: "keyExtractor is a reference, not a literal function",
        code: `
${IMPORT}
import { keyOf } from './keys';

export const Feed = ({ rows }) => <LegendList data={rows} recycleItems keyExtractor={keyOf} />;
`,
      },
      {
        name: "only the second parameter counts, not the first",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(index, position) => String(index)} />
);
`,
      },
      {
        name: "rest element in the index position",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, ...rest) => item.id + rest.length} />
);
`,
      },
      {
        name: "destructured second parameter",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, { index }) => item.id} />
);
`,
      },
      {
        name: "second parameter with a default is not a plain identifier",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, index = 0) => item.id} />
);
`,
      },
      {
        name: "a differently named prop is not a keyExtractor",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractorFallback={(item, index) => String(index)} />
);
`,
      },
      {
        name: "keyExtractor with a string value has no expression",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} recycleItems keyExtractor="id" />;
`,
      },
      {
        name: "shorthand keyExtractor has no value at all",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} recycleItems keyExtractor />;
`,
      },
      {
        name: "index only appears in a default value, not in the body",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, index, fallback = index) => item.id} />
);
`,
      },
    ],
    invalid: [
      {
        name: "index returned directly, reported on the function",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, index) => String(index)} />
);
`,
        errors: [{ message: "Return a stable per-item id", line: 5, column: 54 }],
      },
      {
        name: "index concatenated into a composite key",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, index) => item.id + '-' + index} />
);
`,
        errors: 1,
      },
      {
        name: "function expression rather than an arrow",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    recycleItems
    keyExtractor={function rowKey(item, index) {
      return item.id ?? index;
    }}
  />
);
`,
        errors: [{ message: "cached sizes and recycled row state", line: 8, column: 19 }],
      },
      {
        name: "the index parameter may be named anything",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, i) => \`row-\${i}\`} />
);
`,
        errors: 1,
      },
      {
        name: "nested use of index inside a deeper expression",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    recycleItems
    keyExtractor={(item, index) => (item.id ? item.id : rows[index].fallbackId)}
  />
);
`,
        errors: 1,
      },
      {
        name: "the rule is not scoped to Legend List elements",
        code: `
${IMPORT}
import { FlatList } from 'react-native';

export const Feed = ({ rows }) => <FlatList data={rows} keyExtractor={(item, index) => String(index)} />;
`,
        errors: 1,
      },
      {
        name: "two offending extractors in one file",
        code: `
${IMPORT}

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned} recycleItems keyExtractor={(item, index) => String(index)} />
    <LegendList data={rows} recycleItems keyExtractor={(item, index) => index.toString()} />
  </>
);
`,
        errors: 2,
      },
      {
        name: "documents current behaviour: a member property named like the index parameter counts as a use",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} recycleItems keyExtractor={(item, index) => String(item.index)} />
);
`,
        errors: 1,
      },
    ],
  },

  "no-remount-key": {
    valid: [
      {
        name: "dataKey is the supported prop",
        code: `
${IMPORT}

export const Feed = ({ rows, filter }) => (
  <LegendList dataKey={filter} data={rows} keyExtractor={k} recycleItems renderItem={r} />
);
`,
      },
      {
        name: "key on a row inside renderItem, not on the list",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    renderItem={({ item }) => <Row key={item.id} item={item} />}
  />
);
`,
      },
      {
        name: "key on a tag that only contains LegendList in its name",
        code: `
${IMPORT}

export const Feed = ({ filter }) => <LegendListSkeleton key={filter} />;
`,
      },
      {
        name: "list with no attributes at all",
        code: `
${IMPORT}

export const Feed = () => <LegendList />;
`,
      },
      {
        name: "props that merely start with key are not the key prop",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} keyboardShouldPersistTaps="handled" recycleItems />
);
`,
      },
    ],
    invalid: [
      {
        name: "key on the list, reported on the attribute",
        code: `
${IMPORT}

export const Feed = ({ rows, filter }) => (
  <LegendList key={filter} data={rows} keyExtractor={k} recycleItems renderItem={r} />
);
`,
        errors: [{ message: "Pass `dataKey` instead of `key`", line: 5, column: 15 }],
      },
      {
        name: "a static string key is still a remount key",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList key="feed" data={rows} keyExtractor={k} recycleItems />;
`,
        errors: 1,
      },
      {
        name: "member tag whose last segment is LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows, filter }) => <Animated.LegendList key={filter} data={rows} />;
`,
        errors: 1,
      },
      {
        name: "documents current behaviour: a spread does not suppress this rule",
        code: `
${IMPORT}

export const Feed = ({ filter, listProps }) => <LegendList key={filter} {...listProps} />;
`,
        errors: 1,
      },
      {
        name: "a valueless key attribute is still a key",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList key data={rows} keyExtractor={k} recycleItems />;
`,
        errors: 1,
      },
      {
        name: "two keyed lists report twice",
        code: `
${IMPORT}

export const Feed = ({ a, b, filter }) => (
  <>
    <LegendList key={filter} data={a} />
    <LegendList key={filter} data={b} />
  </>
);
`,
        errors: [
          { line: 6, column: 17 },
          { line: 7, column: 17 },
        ],
      },
    ],
  },

  "no-inline-data": {
    valid: [
      {
        name: "a hoisted reference",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r} />;
`,
      },
      {
        name: "a member expression that is not a call",
        code: `
${IMPORT}

export const Feed = ({ state }) => <LegendList data={state.rows} keyExtractor={k} recycleItems />;
`,
      },
      {
        name: "documents current behaviour: a plain function call is not flagged",
        code: `
${IMPORT}

export const Feed = () => <LegendList data={getRows()} keyExtractor={k} recycleItems />;
`,
      },
      {
        name: "conditional between two stable references",
        code: `
${IMPORT}

export const Feed = ({ rows, pinned, showPinned }) => (
  <LegendList data={showPinned ? pinned : rows} keyExtractor={k} recycleItems />
);
`,
      },
      {
        name: "no data prop",
        code: `
${IMPORT}

export const Feed = ({ children }) => <LegendList keyExtractor={k} recycleItems>{children}</LegendList>;
`,
      },
      {
        name: "not a Legend List",
        code: `
${IMPORT}
import { FlatList } from 'react-native';

export const Feed = ({ rows }) => <FlatList data={rows.filter(Boolean)} />;
`,
      },
      {
        name: "tag contains LegendList but does not end with it",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendListPreview data={[1, 2, 3]} />;
`,
      },
      {
        name: "data as a plain string attribute",
        code: `
${IMPORT}

export const Feed = () => <LegendList data="rows" keyExtractor={k} recycleItems />;
`,
      },
    ],
    invalid: [
      {
        name: "an inline array literal, reported on the data attribute",
        code: `
${IMPORT}

export const Feed = ({ a, b }) => (
  <LegendList data={[a, b]} keyExtractor={k} recycleItems renderItem={r} />
);
`,
        errors: [{ message: "Hoist this `data` into a `useMemo`", line: 5, column: 15 }],
      },
      {
        name: "a method call building a fresh array",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows.filter(row => row.active)} keyExtractor={k} recycleItems />
);
`,
        errors: [{ message: "re-diff, re-key and invalidate", line: 5, column: 15 }],
      },
      {
        name: "an empty array default",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows ?? []} keyExtractor={k} recycleItems />;
`,
        errors: 1,
      },
      {
        name: "a chained slice",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows.slice(0, 20)} keyExtractor={k} recycleItems />;
`,
        errors: 1,
      },
      {
        name: "documents current behaviour: an already memoised array still reports",
        code: `
${IMPORT}
import { useMemo } from 'react';

export const Feed = ({ rows }) => {
  const visible = useMemo(() => rows.filter(row => row.active), [rows]);
  return <LegendList data={useMemo(() => rows.filter(row => row.active), [rows])} keyExtractor={k} />;
};
`,
        errors: 1,
      },
      {
        name: "two lists building data inline",
        code: `
${IMPORT}

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned.map(toRow)} keyExtractor={k} recycleItems />
    <LegendList data={[...rows]} keyExtractor={k} recycleItems />
  </>
);
`,
        errors: 2,
      },
      {
        name: "member tag whose last segment is LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <Animated.LegendList data={rows.concat(extra)} />;
`,
        errors: 1,
      },
    ],
  },

  "no-inline-extra-data": {
    valid: [
      {
        name: "a primitive",
        code: `
${IMPORT}

export const Feed = ({ rows, selectedId }) => (
  <LegendList data={rows} extraData={selectedId} keyExtractor={k} recycleItems />
);
`,
      },
      {
        name: "a member expression",
        code: `
${IMPORT}

export const Feed = ({ rows, ui }) => <LegendList data={rows} extraData={ui.selectedId} keyExtractor={k} />;
`,
      },
      {
        name: "a call expression is not an object or array literal",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} extraData={buildExtra()} keyExtractor={k} />;
`,
      },
      {
        name: "a string attribute has no expression container",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} extraData="dark" keyExtractor={k} />;
`,
      },
      {
        name: "shorthand extraData has no value",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} extraData keyExtractor={k} />;
`,
      },
      {
        name: "a differently named prop",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} extraDataSource={{ a: 1 }} keyExtractor={k} />;
`,
      },
      {
        name: "a template literal is neither object nor array",
        code: `
${IMPORT}

export const Feed = ({ rows, mode }) => <LegendList data={rows} extraData={\`mode-\${mode}\`} keyExtractor={k} />;
`,
      },
    ],
    invalid: [
      {
        name: "an inline object, reported on the expression with the object wording",
        code: `
${IMPORT}

export const Feed = ({ rows, selectedId, isEditing }) => (
  <LegendList data={rows} extraData={{ selectedId, isEditing }} keyExtractor={k} recycleItems />
);
`,
        errors: [{ message: "hoist this object when it is stable", line: 5, column: 38 }],
      },
      {
        name: "an inline array uses the array wording",
        code: `
${IMPORT}

export const Feed = ({ rows, selectedId }) => (
  <LegendList data={rows} extraData={[selectedId]} keyExtractor={k} recycleItems />
);
`,
        errors: [{ message: "A fresh array reference each render", line: 5, column: 38 }],
      },
      {
        name: "an empty object literal still takes a fresh identity",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} extraData={{}} keyExtractor={k} />;
`,
        errors: 1,
      },
      {
        name: "an empty array literal still takes a fresh identity",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} extraData={[]} keyExtractor={k} />;
`,
        errors: 1,
      },
      {
        name: "the rule is not scoped to Legend List elements",
        code: `
${IMPORT}
import { FlatList } from 'react-native';

export const Feed = ({ rows, selectedId }) => <FlatList data={rows} extraData={{ selectedId }} />;
`,
        errors: 1,
      },
      {
        name: "two offending extraData props",
        code: `
${IMPORT}

export const Feed = ({ rows, pinned, selectedId }) => (
  <>
    <LegendList data={pinned} extraData={{ selectedId }} keyExtractor={k} />
    <LegendList data={rows} extraData={[selectedId]} keyExtractor={k} />
  </>
);
`,
        errors: [
          { message: "object", line: 6 },
          { message: "array", line: 7 },
        ],
      },
    ],
  },

  "no-inline-render-item-props": {
    valid: [
      {
        name: "an inline object on the list itself, before renderItem",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList style={{ flex: 1 }} data={rows} keyExtractor={k} recycleItems renderItem={r} />
);
`,
      },
      {
        name: "an inline object on the list itself, after renderItem",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r} contentContainerStyle={{ padding: 8 }} />
);
`,
      },
      {
        name: "row props that are all stable",
        code: `
${IMPORT}
import { styles } from './styles';

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    renderItem={({ item }) => <Row item={item} style={styles.row} title="Row" compact onPress={onPress} />}
  />
);
`,
      },
      {
        name: "a nested arrow inside renderItem is not a literal",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} renderItem={({ item }) => <Row onPress={() => select(item.id)} />} />
);
`,
      },
      {
        name: "a prop named renderItem elsewhere does not open a scope",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} renderItemFooter={<Footer style={{ padding: 4 }} />} keyExtractor={k} />
);
`,
      },
      {
        name: "an inline object inside a sibling render prop, outside renderItem",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    ListEmptyComponent={<Empty style={{ padding: 24 }} />}
  />
);
`,
      },
    ],
    invalid: [
      {
        name: "an inline style object on a row, reported on the expression container",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    renderItem={({ item }) => <Row item={item} style={{ paddingVertical: 8 }} />}
  />
);
`,
        errors: [{ message: "build this object inside the row", line: 9, column: 54 }],
      },
      {
        name: "an inline array prop on a row uses the array wording",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} renderItem={({ item }) => <Row tags={[item.id]} />} keyExtractor={k} />
);
`,
        errors: [{ message: "A fresh array each render", line: 5 }],
      },
      {
        name: "two inline literals on the same row",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    renderItem={({ item }) => <Row style={{ padding: 8 }} actions={[remove, pin]} />}
  />
);
`,
        errors: 2,
      },
      {
        name: "an inline literal nested several elements deep inside renderItem",
        code: `
${IMPORT}
import { View } from 'react-native';

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    renderItem={({ item }) => (
      <View>
        <Row item={item} badge={{ tone: 'warning' }} />
      </View>
    )}
  />
);
`,
        errors: [{ message: "typing anywhere re-renders every visible row", line: 10 }],
      },
      {
        name: "a function expression renderItem opens the same scope",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    renderItem={function Row({ item }) {
      return <RowView item={item} style={{ opacity: 1 }} />;
    }}
  />
);
`,
        errors: 1,
      },
      {
        name: "the scope closes again after renderItem, so only the inner literal reports",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    renderItem={({ item }) => <Row style={{ padding: 8 }} />}
    ListHeaderComponent={<Header style={{ padding: 16 }} />}
  />
);
`,
        errors: [{ line: 9, column: 42 }],
      },
      {
        name: "a nested renderItem closes back to the outer scope, not to zero",
        code: `
${IMPORT}

export const Feed = ({ sections }) => (
  <LegendList
    data={sections}
    renderItem={({ item: section }) => (
      <LegendList
        data={section.rows}
        renderItem={({ item }) => <Row item={item} />}
        contentContainerStyle={{ paddingLeft: 12 }}
      />
    )}
  />
);
`,
        errors: [{ message: "build this object inside the row", line: 11, column: 31 }],
      },
      {
        name: "renderItem on a FlatList is treated the same way",
        code: `
import { FlatList } from 'react-native';

export const Feed = ({ rows }) => <FlatList data={rows} renderItem={({ item }) => <Row meta={{ item }} />} />;
`,
        errors: 1,
      },
    ],
  },

  "no-mixed-children": {
    valid: [
      {
        name: "data with no children",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r} />;
`,
      },
      {
        name: "children mode without data",
        code: `
${IMPORT}

export const Feed = () => (
  <LegendList keyExtractor={k} recycleItems>
    <Row id="a" />
    <Row id="b" />
  </LegendList>
);
`,
      },
      {
        name: "data with whitespace-only children",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r}>
  </LegendList>
);
`,
      },
      {
        name: "data with only a JSX comment",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r}>
    {/* rows come from data */}
  </LegendList>
);
`,
      },
      {
        name: "data with an empty expression container",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r}>{}</LegendList>
);
`,
      },
      {
        name: "children plus data on a tag that only contains LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendListPanel data={rows}>
    <Row id="a" />
  </LegendListPanel>
);
`,
      },
      {
        name: "children plus data on a FlatList",
        code: `
${IMPORT}
import { FlatList } from 'react-native';

export const Feed = ({ rows }) => (
  <FlatList data={rows}>
    <Row id="a" />
  </FlatList>
);
`,
      },
    ],
    invalid: [
      {
        name: "data plus an element child, reported on the opening element",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={r}>
    <Row id="a" />
  </LegendList>
);
`,
        errors: [{ message: "Keep either `data` with `renderItem` or children mode", line: 5, column: 3 }],
      },
      {
        name: "data plus non-blank text",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems>Loading</LegendList>
);
`,
        errors: 1,
      },
      {
        name: "data plus a fragment child",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems>
    <>
      <Row id="a" />
    </>
  </LegendList>
);
`,
        errors: 1,
      },
      {
        name: "data plus a non-empty expression container",
        code: `
${IMPORT}

export const Feed = ({ rows, header }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems>{header}</LegendList>
);
`,
        errors: 1,
      },
      {
        name: "nested lists both mix data and children",
        code: `
${IMPORT}

export const Feed = ({ rows, nested }) => (
  <LegendList data={rows} keyExtractor={k}>
    <LegendList data={nested} keyExtractor={k}>
      <Row id="a" />
    </LegendList>
  </LegendList>
);
`,
        errors: [
          { line: 5, column: 3 },
          { line: 6, column: 5 },
        ],
      },
      {
        name: "member tag whose last segment is LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <Animated.LegendList data={rows}>
    <Row id="a" />
  </Animated.LegendList>
);
`,
        errors: 1,
      },
    ],
  },

  "no-flex-in-content-container": {
    valid: [
      {
        name: "a string-subscript lookup resolves to the real key",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { paddingTop: 8 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles['content']} keyExtractor={k} />
);
`,
      },
      {
        name: "a computed inline key named flex is the value of flex, not the property",
        code: `
${IMPORT}

const flex = 'flex';

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={{ [flex]: 1 }} keyExtractor={k} />
);
`,
      },
      {
        name: "a key belonging to another sheet does not leak into this one",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const overlay = StyleSheet.create({ fill: { flex: 1 } });
const styles = StyleSheet.create({ content: { paddingTop: 8 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.fill} style={overlay.fill} keyExtractor={k} />
);
`,
      },
      {
        name: "a dynamic key cannot be resolved, so nothing reports",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows, variant }) => (
  <LegendList data={rows} contentContainerStyle={styles[variant]} keyExtractor={k} />
);
`,
      },
      {
        name: "padding only, inline",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={{ paddingHorizontal: 16 }} keyExtractor={k} />
);
`,
      },
      {
        name: "flexGrow is the supported escape hatch",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={{ flexGrow: 1 }} keyExtractor={k} />
);
`,
      },
      {
        name: "a named style without flex",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { paddingBottom: 32 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "flex lives on a sibling key that is never referenced",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { paddingBottom: 32 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} style={styles.screen} keyExtractor={k} />
);
`,
      },
      {
        name: "the factory is not StyleSheet.create, only create",
        code: `
${IMPORT}
import { create } from 'react-native-unistyles';

const styles = create({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "the method is not create",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.compose({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "the object is not the StyleSheet identifier",
        code: `
${IMPORT}
import { RN } from './rn';

const styles = RN.StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "a computed create member is not recognised",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet['create']({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "create with no argument",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create();

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "create given an identifier rather than a literal or factory",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';
import { sheet } from './sheet';

const styles = StyleSheet.create(sheet);

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "a theme factory that returns a call rather than a literal",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';
import { makeStyles } from './make-styles';

const styles = StyleSheet.create(theme => (makeStyles(theme)));

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "create given a call rather than a factory function",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create(makeStyles({ content: { flex: 1 } }));

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "a computed key in the sheet is skipped even when it spells the referenced key",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const content = 'content';
const styles = StyleSheet.create({ [content]: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "a spread member in the sheet is skipped and siblings still parse",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';
import { base } from './base';

const styles = StyleSheet.create({ ...base, content: { paddingTop: 8 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "a sheet entry that is not an object literal",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';
import { fill } from './base';

const styles = StyleSheet.create({ content: fill });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "the style is reached through a deeper member chain, not a bare styles identifier",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const theme = { styles: StyleSheet.create({ content: { flex: 1 } }) };

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={theme.styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "a variable-subscript styles lookup resolves to the variable name, not a sheet key",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows, variant }) => (
  <LegendList data={rows} contentContainerStyle={styles[variant]} keyExtractor={k} />
);
`,
      },
      {
        name: "a block-bodied theme callback reads what it returns, not a local object",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create(theme => {
  const spacing = { small: 4 };
  return { content: { paddingTop: spacing.small } };
});

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
      },
      {
        name: "contentContainerStyle as a plain string attribute",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle="content" keyExtractor={k} />
);
`,
      },
      {
        name: "a differently named style prop",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyleOverride={{ flex: 1 }} keyExtractor={k} />
);
`,
      },
      {
        name: "flex on style rather than contentContainerStyle",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }} keyExtractor={k} />
);
`,
      },
      {
        name: "a spread inside the inline content container style",
        code: `
${IMPORT}
import { base } from './base';

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={{ ...base, padding: 8 }} keyExtractor={k} />
);
`,
      },
    ],
    invalid: [
      {
        name: "a sheet under any identifier is tracked",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const sheet = StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={sheet.content} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "one flex member of an array style is enough",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { paddingTop: 8 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={[styles.content, { flex: 1 }]} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "a named style inside an array style is resolved",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={[styles.content]} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "a string-subscript lookup resolves to a flex key",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles['content']} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "inline flex, reported on the attribute",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={{ flex: 1 }} keyExtractor={k} recycleItems />
);
`,
        errors: [{ message: "Move `flex` onto `style`", line: 5, column: 27 }],
      },
      {
        name: "a string key spelled flex",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={{ 'flex': 1, padding: 8 }} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "a named style whose sheet is declared after the JSX",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);

const styles = StyleSheet.create({ content: { flex: 1, paddingTop: 8 } });
`,
        errors: [{ message: "the list measures as zero height", line: 6, column: 27 }],
      },
      {
        name: "a theme factory arrow returning a parenthesised object",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create(theme => ({
  content: { flex: 1, backgroundColor: theme.background },
}));

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "a theme factory function expression with a return statement",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create(function build(theme) {
  return { content: { flex: 1, backgroundColor: theme.background } };
});

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "a theme factory arrow with a block body",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create(theme => {
  return { content: { flex: 1, backgroundColor: theme.background } };
});

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "a quoted sheet key still matches the referenced style",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ 'content': { flex: 1 } });

export const Feed = ({ rows }) => (
  <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
);
`,
        errors: 1,
      },
      {
        name: "documents current behaviour: the rule is not scoped to Legend List elements",
        code: `
${IMPORT}
import { ScrollView } from 'react-native';

export const Screen = () => (
  <ScrollView contentContainerStyle={{ flex: 1 }}>
    <Feed />
  </ScrollView>
);
`,
        errors: 1,
      },
      {
        name: "two lists, one offending key and one clean key",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ bad: { flex: 1 }, good: { paddingTop: 8 } });

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned} contentContainerStyle={styles.good} keyExtractor={k} />
    <LegendList data={rows} contentContainerStyle={styles.bad} keyExtractor={k} />
  </>
);
`,
        errors: [{ line: 10, column: 29 }],
      },
      {
        name: "both an inline flex and a named flex in one file",
        code: `
${IMPORT}
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({ content: { flex: 1 } });

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned} contentContainerStyle={{ flex: 1 }} keyExtractor={k} />
    <LegendList data={rows} contentContainerStyle={styles.content} keyExtractor={k} />
  </>
);
`,
        errors: 2,
      },
    ],
  },

  "typed-items-need-item-type": {
    valid: [
      {
        name: "getItemType is present alongside the branch",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    getItemType={item => item.type}
    renderItem={({ item }) => (item.type === 'header' ? <Header item={item} /> : <Photo item={item} />)}
  />
);
`,
      },
      {
        name: "the row does not branch on a type member",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={({ item }) => <Row item={item} />} />
);
`,
      },
      {
        name: "the row branches on a differently named field",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    renderItem={({ item }) => (item.kind === 'header' ? <Header item={item} /> : <Photo item={item} />)}
  />
);
`,
      },
      {
        name: "no renderItem prop at all",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} recycleItems />;
`,
      },
      {
        name: "a spread suppresses the rule",
        code: `
${IMPORT}

export const Feed = ({ rows, listProps }) => (
  <LegendList {...listProps} renderItem={({ item }) => (item.type === 'a' ? <A /> : <B />)} />
);
`,
      },
      {
        name: "the named renderer is imported, so its body is unknown",
        code: `
${IMPORT}
import { renderRow } from './render-row';

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />;
`,
      },
      {
        name: "a declarator with no initialiser is never registered",
        code: `
${IMPORT}

let renderRow;
renderRow = ({ item }) => (item.type === 'header' ? <Header /> : <Photo />);

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />;
`,
      },
      {
        name: "a destructured declarator is not registered by name",
        code: `
${IMPORT}
import * as renderers from './renderers';

const { renderRow } = renderers;

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />;
`,
      },
      {
        name: "an anonymous default-exported function has no name to register",
        code: `
${IMPORT}

export default function ({ item }) {
  return item.type === 'header' ? <Header /> : <Photo />;
}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />;
`,
      },
      {
        name: "renderItem given as a string attribute has no expression",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem="row" />;
`,
      },
      {
        name: "shorthand renderItem has no value",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem />;
`,
      },
      {
        name: "the branch is in a tag that only contains LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendListVirtual data={rows} renderItem={({ item }) => (item.type === 'a' ? <A /> : <B />)} />
);
`,
      },
      {
        name: "a computed type lookup is not a member property named type",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    renderItem={({ item }) => (item['type'] === 'header' ? <Header /> : <Photo />)}
  />
);
`,
      },
      {
        name: "only the renderer the list actually names is inspected",
        code: `
${IMPORT}

const renderRow = ({ item }) => <Row item={item} />;
const renderTypedRow = ({ item }) => (item.type === 'header' ? <Header /> : <Photo />);

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />;
`,
      },
    ],
    invalid: [
      {
        name: "an inline row branching on item.type, reported on the opening element",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    keyExtractor={k}
    recycleItems
    renderItem={({ item }) => (item.type === 'header' ? <Header item={item} /> : <Photo item={item} />)}
  />
);
`,
        errors: [{ message: "Add `getItemType={item => item.type}`", line: 5, column: 3 }],
      },
      {
        name: "a function declaration renderer hoisted below the list",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={renderRow} />
);

function renderRow({ item }) {
  switch (item.type) {
    case 'header':
      return <Header item={item} />;
    default:
      return <Photo item={item} />;
  }
}
`,
        errors: [{ message: "its own recycling pool", line: 5, column: 3 }],
      },
      {
        name: "a const arrow renderer declared below the list",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={renderRow} />
);

const renderRow = ({ item }) => (item.type === 'header' ? <Header item={item} /> : <Photo item={item} />);
`,
        errors: 1,
      },
      {
        name: "two lists sharing one branching renderer",
        code: `
${IMPORT}

const renderRow = ({ item }) => (item.type === 'header' ? <Header item={item} /> : <Photo item={item} />);

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned} keyExtractor={k} renderItem={renderRow} />
    <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />
  </>
);
`,
        errors: [
          { line: 8, column: 5 },
          { line: 9, column: 5 },
        ],
      },
      {
        name: "a later declaration without an initialiser must not unregister the renderer",
        code: `
${IMPORT}

const renderRow = ({ item }) => (item.type === 'header' ? <Header item={item} /> : <Photo item={item} />);

export const Draft = () => {
  let renderRow;
  return renderRow;
};

export const Feed = ({ rows }) => <LegendList data={rows} keyExtractor={k} renderItem={renderRow} />;
`,
        errors: 1,
      },
      {
        name: "a near-miss prop name does not satisfy getItemType",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    getItemTypeFallback={item => item.type}
    renderItem={({ item }) => (item.type === 'header' ? <Header /> : <Photo />)}
  />
);
`,
        errors: 1,
      },
      {
        name: "member tag whose last segment is LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <Animated.LegendList data={rows} renderItem={({ item }) => (item.type === 'a' ? <A /> : <B />)} />
);
`,
        errors: 1,
      },
      {
        name: "documents current behaviour: any member named type in the renderer counts",
        code: `
${IMPORT}
import { styles } from './styles';

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} renderItem={({ item }) => <Row style={styles.type} />} />
);
`,
        errors: 1,
      },
    ],
  },

  "no-scrollview-map": {
    valid: [
      {
        name: "a short static list of children",
        code: `
import { ScrollView } from 'react-native';

export const Settings = () => (
  <ScrollView>
    <Row id="a" />
    <Row id="b" />
  </ScrollView>
);
`,
      },
      {
        name: "an expression child that is not a call",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ header }) => <ScrollView>{header}</ScrollView>;
`,
      },
      {
        name: "a conditional child",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ show }) => <ScrollView>{show && <Banner />}</ScrollView>;
`,
      },
      {
        name: "a plain function call rather than a method call",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows }) => <ScrollView>{renderRows(rows)}</ScrollView>;
`,
      },
      {
        name: "a method call that is not map",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows }) => <ScrollView>{rows.filter(Boolean)}</ScrollView>;
`,
      },
      {
        name: "a computed member call spelled map",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows }) => <ScrollView>{rows['map'](toRow)}</ScrollView>;
`,
      },
      {
        name: "documents current behaviour: optional chaining is not a plain call expression",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows }) => <ScrollView>{rows?.map(row => <Row key={row.id} />)}</ScrollView>;
`,
      },
      {
        name: "documents current behaviour: only direct children are inspected",
        code: `
import { ScrollView, View } from 'react-native';

export const Settings = ({ rows }) => (
  <ScrollView>
    <View>{rows.map(row => <Row key={row.id} item={row} />)}</View>
  </ScrollView>
);
`,
      },
      {
        name: "a tag whose name only starts with ScrollView",
        code: `
export const Settings = ({ rows }) => (
  <ScrollViewShim>{rows.map(row => <Row key={row.id} />)}</ScrollViewShim>
);
`,
      },
      {
        name: "a map inside a View rather than a ScrollView",
        code: `
import { ScrollView, View } from 'react-native';

export const Settings = ({ rows }) => <View>{rows.map(row => <Row key={row.id} />)}</View>;
`,
      },
    ],
    invalid: [
      {
        name: "a mapped collection as a direct child, reported on the expression container",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows }) => (
  <ScrollView>
    {rows.map(row => <Row key={row.id} item={row} />)}
  </ScrollView>
);
`,
        errors: [{ message: "Render this collection with `LegendList`", line: 6, column: 5 }],
      },
      {
        name: "a member tag whose last segment is ScrollView",
        code: `
import Animated from 'react-native-reanimated';

export const Settings = ({ rows }) => (
  <Animated.ScrollView>{rows.map(row => <Row key={row.id} />)}</Animated.ScrollView>
);
`,
        errors: [{ message: "200 rows cost 200 mounts", line: 5, column: 24 }],
      },
      {
        name: "documents current behaviour: only the first mapped child in a ScrollView reports",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows, pinned }) => (
  <ScrollView>
    {pinned.map(row => <Row key={row.id} />)}
    {rows.map(row => <Row key={row.id} />)}
  </ScrollView>
);
`,
        errors: [{ line: 6, column: 5 }],
      },
      {
        name: "two ScrollViews each report once",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows, pinned }) => (
  <>
    <ScrollView>{pinned.map(row => <Row key={row.id} />)}</ScrollView>
    <ScrollView>{rows.map(row => <Row key={row.id} />)}</ScrollView>
  </>
);
`,
        errors: 2,
      },
      {
        name: "a chained map still reports",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows }) => (
  <ScrollView>{rows.filter(Boolean).map(row => <Row key={row.id} />)}</ScrollView>
);
`,
        errors: 1,
      },
      {
        name: "a nested ScrollView reports on its own mapped child",
        code: `
import { ScrollView } from 'react-native';

export const Settings = ({ rows, tabs }) => (
  <ScrollView horizontal>
    <ScrollView>{rows.map(row => <Row key={row.id} />)}</ScrollView>
  </ScrollView>
);
`,
        errors: 1,
      },
    ],
  },

  "no-unsupported-props": {
    valid: [
      {
        name: "the supported chat props",
        code: `
${IMPORT}

export const Chat = ({ messages }) => (
  <LegendList
    data={messages}
    keyExtractor={k}
    recycleItems
    maintainScrollAtEnd
    initialScrollAtEnd
    maintainVisibleContentPosition
  />
);
`,
      },
      {
        name: "near-miss prop names",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    masonryColumns={2}
    onBlankAreaChange={f}
    cellRendererComponent={C}
    invertedList
    optimizeItem
    autoLayout
  />
);
`,
      },
      {
        name: "an unsupported prop on a FlatList",
        code: `
${IMPORT}
import { FlatList } from 'react-native';

export const Feed = ({ rows }) => <FlatList data={rows} inverted />;
`,
      },
      {
        name: "an unsupported prop on a tag that only contains LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <LegendListLegacy data={rows} inverted masonry />;
`,
      },
      {
        name: "a list with only a spread",
        code: `
${IMPORT}

export const Feed = ({ listProps }) => <LegendList {...listProps} />;
`,
      },
      {
        name: "an unsupported name on a row rendered by the list",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList data={rows} keyExtractor={k} recycleItems renderItem={({ item }) => <Row inverted masonry />} />
);
`,
      },
    ],
    invalid: [
      {
        name: "inverted, reported on the attribute",
        code: `
${IMPORT}

export const Chat = ({ messages }) => (
  <LegendList data={messages} keyExtractor={k} recycleItems inverted renderItem={r} />
);
`,
        errors: [{ message: "Legend List v3 has no such prop", line: 5, column: 61 }],
      },
      {
        name: "every unsupported prop reports once each",
        code: `
${IMPORT}

export const Feed = ({ rows }) => (
  <LegendList
    data={rows}
    masonry
    optimizeItemArrangement
    inverted
    onBlankArea={onBlank}
    disableAutoLayout
    CellRendererComponent={Cell}
  />
);
`,
        errors: [
          { line: 7, column: 5 },
          { line: 8, column: 5 },
          { line: 9, column: 5 },
          { line: 10, column: 5 },
          { line: 11, column: 5 },
          { line: 12, column: 5 },
        ],
      },
      {
        name: "documents current behaviour: a spread does not suppress this rule",
        code: `
${IMPORT}

export const Feed = ({ listProps }) => <LegendList {...listProps} masonry />;
`,
        errors: 1,
      },
      {
        name: "only the unsupported props of a mixed prop list report",
        code: `
${IMPORT}

export const Chat = ({ messages }) => (
  <LegendList
    data={messages}
    keyExtractor={k}
    recycleItems
    maintainScrollAtEnd
    maintainVisibleContentPosition
    inverted
  />
);
`,
        errors: [{ line: 11, column: 5 }],
      },
      {
        name: "member tag whose last segment is LegendList",
        code: `
${IMPORT}

export const Feed = ({ rows }) => <Animated.LegendList data={rows} onBlankArea={onBlank} />;
`,
        errors: 1,
      },
      {
        name: "two lists each with one unsupported prop",
        code: `
${IMPORT}

export const Feed = ({ rows, pinned }) => (
  <>
    <LegendList data={pinned} disableAutoLayout />
    <LegendList data={rows} CellRendererComponent={Cell} />
  </>
);
`,
        errors: [
          { line: 6, column: 31 },
          { line: 7, column: 29 },
        ],
      },
    ],
  },
});
