import i18n from "../packages/lint/dist/react/rules/i18n/index.js";
import { moduleTests } from "./harness.js";

moduleTests(i18n, {
  "no-bare-text": {
    valid: [
      {
        name: "the text goes through t()",
        code: `
import { useTranslation } from "react-i18next";

export const Greeting = () => {
  const { t } = useTranslation();
  return <Text>{t("greeting.title")}</Text>;
};
`,
      },
      { name: "Trans is a translation component", code: "const node = <Trans>Save your changes</Trans>;" },
      { name: "Plural is a translation component", code: "const node = <Plural>Save your changes</Plural>;" },
      { name: "Select is a translation component", code: "const node = <Select>Save your changes</Select>;" },
      {
        name: "a member tag resolves to its last segment",
        code: "const node = <I18n.Trans>Save your changes</I18n.Trans>;",
      },
      { name: "any attribute at all opts the element out", code: "const node = <Text style={s}>Save changes</Text>;" },
      { name: "two characters is below the length floor", code: "const node = <Text>Hi</Text>;" },
      { name: "text that does not start with a letter", code: "const node = <Text>1 new message</Text>;" },
      { name: "text starting with punctuation", code: "const node = <Text>#1 in sales</Text>;" },
      {
        name: "a non-latin script never matches the ASCII-only head",
        code: "const node = <Text>مرحبا بالعالم</Text>;",
      },
      { name: "a string inside an expression container", code: 'const node = <Text>{"Save your changes"}</Text>;' },
      { name: "a template literal child", code: "const node = <Text>{`Save your changes`}</Text>;" },
      { name: "whitespace-only children are filtered away", code: "const node = <Text>   </Text>;" },
      { name: "no children at all", code: "const node = <Text></Text>;" },
      { name: "a self-closing element", code: "const node = <Text />;" },
      { name: "text plus an interpolation is two children", code: "const node = <Text>Hello there {name}</Text>;" },
      { name: "text plus an element is two children", code: "const node = <Text>Save changes <Icon /></Text>;" },
      { name: "a fragment is not a JSXElement", code: "const node = <>Save your changes</>;" },
      {
        name: "an element whose only child is another element",
        code: "const node = <View><Icon /></View>;",
      },
    ],
    invalid: [
      {
        name: "plain literal text",
        code: `
export const SaveButton = () => {
  return (
    <Pressable onPress={save}>
      <Text>Save changes</Text>
    </Pressable>
  );
};
`,
        errors: [{ message: 'Wrap this text in `t("<key>")`', line: 5, column: 13 }],
      },
      {
        name: "three characters is the length floor",
        code: "const node = <Text>Hey</Text>;",
        errors: [{ message: /add the key to every locale file/, line: 1, column: 20 }],
      },
      {
        name: "a component whose name merely starts with Trans",
        code: "const node = <Transition>Save your changes</Transition>;",
        errors: 1,
      },
      {
        name: "text spread over several lines",
        code: `
const node = (
  <Text>
    Save your changes before leaving
  </Text>
);
`,
        errors: [{ line: 3, column: 9 }],
      },
      {
        name: "two sibling elements report once each",
        code: `
const node = (
  <View>
    <Text>Save changes</Text>
    <Text>Discard changes</Text>
  </View>
);
`,
        errors: [
          { line: 4, column: 11 },
          { line: 5, column: 11 },
        ],
      },
      {
        name: "only the innermost element reports, never its wrapper",
        code: "const node = <View><Text>Save your changes</Text></View>;",
        errors: 1,
      },
      {
        name: "a lowercase host element",
        code: "const node = <p>Save your changes</p>;",
        errors: 1,
      },
      {
        name: "text carrying punctuation",
        code: "const node = <Text>Hello, world!</Text>;",
        errors: 1,
      },
      {
        name: "documents current behaviour: an html entity is matched as raw source, not as its decoded character",
        code: "const node = <Text>Hello&rbrace;there</Text>;",
        errors: 1,
      },
    ],
  },

  "no-bare-attrs": {
    valid: [
      {
        name: "the value goes through t()",
        code: `
import { useTranslation } from "react-i18next";

export const EmailField = () => {
  const { t } = useTranslation();
  return <TextInput placeholder={t("auth.email")} onChangeText={setEmail} />;
};
`,
      },
      { name: "an attribute that is not on the list", code: '<TextInput testID="email-field" />;' },
      { name: "an empty string is exempt", code: '<TextInput placeholder="" />;' },
      { name: "an identifier value", code: "<Pressable accessibilityLabel={label} />;" },
      { name: "a valueless boolean attribute", code: "<Modal title />;" },
      { name: "attribute names are case sensitive", code: '<TextInput Placeholder="Email" />;' },
      { name: "a string literal inside an expression container", code: '<Text title={"Save"} />;' },
      { name: "a title nested in an object prop is not an attribute", code: '<Screen options={{ title: "Home" }} />;' },
      { name: "a spread attribute has no name", code: "<TextInput {...inputProps} />;" },
      { name: "a numeric value", code: "<Modal title={42} />;" },
      {
        name: "options restrict the list, so a default name stops firing",
        code: '<TextInput placeholder="Email" />;',
        options: { attributes: ["label"] },
      },
      {
        name: "a one-name list is the smallest the schema accepts",
        code: '<Pressable accessibilityLabel="Save" />;',
        options: { attributes: ["placeholder"] },
      },
      {
        name: "a configured list replaces the defaults rather than extending them",
        code: '<Pressable accessibilityHint="Opens settings" />;',
        options: { attributes: ["placeholder"] },
      },
    ],
    invalid: [
      {
        name: "a bare placeholder",
        code: `
export const EmailField = () => {
  return <TextInput placeholder="Email address" onChangeText={setEmail} />;
};
`,
        errors: [{ message: 'Pass `t("<key>")` as this attribute value', line: 3, column: 21 }],
      },
      {
        name: "every default attribute name",
        code: `
<View>
  <TextInput placeholder="Email" />
  <Pressable accessibilityLabel="Save" />
  <Pressable accessibilityHint="Saves the draft" />
  <Modal title="Settings" />
</View>;
`,
        errors: [{ line: 3 }, { line: 4 }, { line: 5 }, { line: 6 }],
      },
      {
        name: "a one-character value is still bare",
        code: '<Modal title="a" />;',
        errors: [{ line: 1, column: 8 }],
      },
      {
        name: "an empty options object falls back to the defaults",
        code: '<TextInput placeholder="Email" />;',
        options: {},
        errors: 1,
      },
      {
        name: "a configured list of two names",
        code: '<Chip label="Save" subtitle="Right now" caption="Ignored" />;',
        options: { attributes: ["label", "subtitle"] },
        errors: 2,
      },
      {
        name: "a configured list that names one default",
        code: '<TextInput placeholder="Email" accessibilityLabel="Email field" />;',
        options: { attributes: ["placeholder"] },
        errors: 1,
      },
      {
        name: "documents current behaviour: a namespaced attribute is matched on its local part",
        code: '<use xlink:title="Save" />;',
        errors: 1,
      },
    ],
  },

  "no-bare-toast": {
    valid: [
      {
        name: "a computed member named like a toast method is a different method",
        code: 'toast[success]("Saved");',
      },
      {
        name: "the message goes through t()",
        code: `
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useSave = () => {
  const { t } = useTranslation();
  return () => toast.success(t("todo.saved"));
};
`,
      },
      { name: "a bare toast call is not a method call", code: 'toast("Saved");' },
      { name: "a method that is not in the set", code: 'toast.custom("Saved");' },
      { name: "toast.promise takes a promise", code: "toast.promise(save(), { loading: 1 });" },
      { name: "the receiver name is case sensitive", code: 'Toast.success("Saved");' },
      { name: "a differently named receiver", code: 'myToast.error("Failed");' },
      { name: "a nested receiver is not the toast identifier", code: 'sonner.toast.success("Saved");' },
      { name: "a second argument opts out", code: 'toast.success("Saved", { duration: 2000 });' },
      { name: "no arguments at all", code: "toast.error();" },
      { name: "a template literal is not a string Literal", code: "toast.info(`Saved just now`);" },
      { name: "a number literal", code: "toast.info(42);" },
      { name: "a computed member with a string key", code: 'toast["success"]("Saved");' },
      { name: "a variable message", code: "toast.error(message);" },
    ],
    invalid: [
      {
        name: "a literal success message",
        code: `
import { toast } from "sonner";

export const onSaved = () => toast.success("Your changes were saved");
`,
        errors: [{ message: 'Pass `t("<key>")` to this toast instead of the literal', line: 4, column: 44 }],
      },
      {
        name: "every toast method in the set",
        code: `
toast.success("a");
toast.error("b");
toast.info("c");
toast.warning("d");
toast.loading("e");
toast.message("f");
`,
        errors: [{ line: 2 }, { line: 3 }, { line: 4 }, { line: 5 }, { line: 6 }, { line: 7 }],
      },
      {
        name: "an empty string is still a literal, unlike no-bare-attrs",
        code: 'toast.error("");',
        errors: [{ line: 1, column: 13 }],
      },
    ],
  },
});
