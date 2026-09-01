import unistyles from "../packages/lint/dist/react-native/rules/unistyles/index.js";
import { moduleTests } from "./harness.js";

const IMPORTS = `import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
`;

moduleTests(unistyles, {
  "animated-theme": {
    valid: [
      {
        name: "worklet reads theme but nothing destructures useUnistyles",
        code: `import { useAnimatedStyle } from "react-native-reanimated";

export const Card = () => {
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} />;
};`,
      },
      {
        name: "theme destructured but the worklet never reads it",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = ({ progress }) => {
  const { theme } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ opacity: progress.value }));
  return <Animated.View style={animated} accessibilityLabel={theme.name} />;
};`,
      },
      {
        name: "useUnistyles result bound to an identifier rather than an object pattern",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const unistyles = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} unistyles={unistyles} />;
};`,
      },
      {
        name: "object pattern without a theme key",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { rt } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ top: theme.spacing.md, left: rt.insets.left }));
  return <Animated.View style={animated} />;
};`,
      },
      {
        name: "theme destructured from a hook that is not useUnistyles",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useTheme } from "@react-navigation/native";

export const Card = () => {
  const { theme } = useTheme();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} />;
};`,
      },
      {
        name: "a reanimated hook outside the worklet set",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = ({ progress }) => {
  const { theme } = useUnistyles();
  useAnimatedReaction(() => progress.value, value => console.log(value, theme.colors.surface));
  return <Animated.View />;
};`,
      },
      {
        name: "worklet reads a bare theme identifier rather than a member of it",
        code: `import { useDerivedValue } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const value = useDerivedValue(() => pick(theme));
  return <Animated.View style={value} />;
};`,
      },
      {
        name: "member whose object only shares the theme prefix",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: themeColors.surface }));
  return <Animated.View style={animated} />;
};`,
      },
      {
        name: "theme key written as a computed string literal is not recognised",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { ["theme"]: t } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} theme={t} />;
};`,
      },
      {
        name: "theme renamed on destructure so the worklet reads the alias",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme: palette } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: palette.colors.surface }));
  return <Animated.View style={animated} />;
};`,
      },
      {
        name: "a rest element in the pattern is not a theme property",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { ...rest } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} rest={rest} />;
};`,
      },
      {
        name: "worklet hook name reached through a namespace import still counts as a read-free call",
        code: `import * as Reanimated from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const animated = Reanimated.useAnimatedStyle(() => ({ opacity: 1 }));
  return <Animated.View style={animated} label={theme.name} />;
};`,
      },
    ],
    invalid: [
      {
        name: "useAnimatedStyle reading a useUnistyles theme",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} />;
};`,
        errors: [{ message: "useAnimatedTheme()", line: 6, column: 20 }],
      },
      {
        name: "useDerivedValue reading a useUnistyles theme",
        code: `import { useDerivedValue } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const radius = useDerivedValue(() => theme.radii.lg);
  return <Animated.View style={{ borderRadius: radius }} />;
};`,
        errors: [{ message: /Reanimated worklet/, line: 6 }],
      },
      {
        name: "useAnimatedProps reading a useUnistyles theme",
        code: `import { useAnimatedProps } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Ring = () => {
  const { theme } = useUnistyles();
  const props = useAnimatedProps(() => ({ stroke: theme.colors.accent }));
  return <AnimatedCircle animatedProps={props} />;
};`,
        errors: 1,
      },
      {
        name: "namespaced worklet hook call is matched on its property name",
        code: `import * as Reanimated from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const animated = Reanimated.useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} />;
};`,
        errors: 1,
      },
      {
        name: "computed member access on theme still reads as a theme dependency",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = ({ tone }) => {
  const { theme } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme["colors"][tone] }));
  return <Animated.View style={animated} />;
};`,
        errors: 1,
      },
      {
        name: "two worklets in one component report once each",
        code: `import { useAnimatedProps, useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  const props = useAnimatedProps(() => ({ stroke: theme.colors.accent }));
  return <Animated.View style={animated} animatedProps={props} />;
};`,
        errors: [
          { line: 6, column: 20 },
          { line: 7, column: 17 },
        ],
      },
      {
        name: "the destructure appears after the worklet in source order",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  const { theme } = useUnistyles();
  return <Animated.View style={animated} name={theme.name} />;
};`,
        errors: [{ line: 5 }],
      },
      {
        name: "the destructure is in a different component in the same file",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Header = () => {
  const { theme } = useUnistyles();
  return <View accessibilityLabel={theme.name} />;
};

export const Bar = () => {
  const animated = useAnimatedStyle(() => ({ backgroundColor: theme.colors.surface }));
  return <Animated.View style={animated} />;
};`,
        errors: [{ line: 10 }],
      },
      {
        name: "nested worklet inside a callback still reports once",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export const Card = () => {
  const { theme } = useUnistyles();
  const animated = useAnimatedStyle(() => {
    const surface = theme.colors.surface;
    return { backgroundColor: surface };
  });
  return <Animated.View style={animated} />;
};`,
        errors: 1,
      },
    ],
  },

  "content-container": {
    valid: [
      {
        name: "contentContainerStyle on a raw component with a static style",
        code: `${IMPORTS}
const styles = StyleSheet.create({ content: { paddingBottom: 24 } });

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
      },
      {
        name: "the component is wrapped with withUnistyles",
        code: `${IMPORTS}import { withUnistyles } from "react-native-unistyles";

const UniList = withUnistyles(FlatList);
const styles = StyleSheet.create(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const List = () => <UniList contentContainerStyle={styles.content} />;`,
      },
      {
        name: "the referenced key is not in the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const List = () => <FlatList contentContainerStyle={styles.missing} />;`,
      },
      {
        name: "computed style access resolves to no key",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const List = () => <FlatList contentContainerStyle={styles["content"]} />;`,
      },
      {
        name: "inline themed object with no stylesheet reference",
        code: `${IMPORTS}
const styles = StyleSheet.create({ other: { flex: 1 } });

export const List = ({ theme }) => (
  <FlatList contentContainerStyle={{ backgroundColor: theme.colors.bg }} style={styles.other} />
);`,
      },
      {
        name: "the sheet comes from a helper rather than StyleSheet.create",
        code: `${IMPORTS}
const styles = makeStyles(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
      },
      {
        name: "the sheet binding is a plain object literal",
        code: `${IMPORTS}
const styles = { content: { backgroundColor: theme.colors.bg } };

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
      },
      {
        name: "the sheet binding is a destructuring pattern",
        code: `${IMPORTS}
const { styles } = useStyles(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
      },
      {
        name: "StyleSheet.create is handed a variable so no styles object is known",
        code: `${IMPORTS}
const factory = theme => ({ content: { backgroundColor: theme.colors.bg } });
const styles = StyleSheet.create(factory);

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
      },
      {
        name: "the themed style lands on a plain style prop instead",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  content: { backgroundColor: theme.colors.bg },
  row: { paddingVertical: 8 },
}));

export const List = () => <FlatList style={styles.content} contentContainerStyle={styles.row} />;`,
      },
      {
        name: "a member-expression tag whose last segment is wrapped",
        code: `${IMPORTS}import { withUnistyles } from "react-native-unistyles";

const Uni = { List: withUnistyles(FlatList) };
const List = withUnistyles(FlatList);
const styles = StyleSheet.create(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const Screen = () => <Uni.List contentContainerStyle={styles.content} />;`,
      },
      {
        name: "the style depends on neither theme nor rt even though the sheet uses a theme callback",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  content: { paddingBottom: 24 },
  card: { backgroundColor: theme.colors.bg },
}));

export const List = () => <FlatList contentContainerStyle={styles.content} style={styles.card} />;`,
      },
      {
        name: "a member whose object shares only the rt prefix",
        code: `${IMPORTS}
const styles = StyleSheet.create({ content: { paddingBottom: rtl.insets.bottom } });

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
      },
    ],
    invalid: [
      {
        name: "contentContainerStyle reading rt inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({
  content: { paddingBottom: rt.insets.bottom },
}));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: [{ message: "never subscribes to Unistyles updates", line: 8, column: 37 }],
      },
      {
        name: "contentContainerStyle reading theme inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  content: { backgroundColor: theme.colors.bg },
}));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: [{ message: "never subscribes to theme changes", line: 8, column: 37 }],
      },
      {
        name: "rt wins over theme when the style reads both",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({
  content: { backgroundColor: theme.colors.bg, paddingBottom: rt.insets.bottom },
}));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: [{ message: "never subscribes to Unistyles updates" }],
      },
      {
        name: "the theme callback uses a block body with an explicit return",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => {
  return { content: { backgroundColor: theme.colors.bg } };
});

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: [{ message: "never subscribes to theme changes", line: 8 }],
      },
      {
        name: "a plain object literal sheet still resolves",
        code: `${IMPORTS}
const styles = StyleSheet.create({ content: { backgroundColor: theme.colors.bg } });

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: [{ message: "never subscribes to theme changes", line: 6 }],
      },
      {
        name: "a string-literal key in the sheet resolves the same way",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ "content": { backgroundColor: theme.colors.bg } }));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: 1,
      },
      {
        name: "a different component is wrapped, this one is not",
        code: `${IMPORTS}import { withUnistyles } from "react-native-unistyles";

const UniScroll = withUnistyles(ScrollView);
const styles = StyleSheet.create(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: 1,
      },
      {
        name: "an array value reports once even though both members are themed",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  content: { backgroundColor: theme.colors.bg },
  extra: { borderColor: theme.colors.border },
}));

export const List = () => <FlatList contentContainerStyle={[styles.content, styles.extra]} />;`,
        errors: 1,
      },
      {
        name: "two raw components each report",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ content: { backgroundColor: theme.colors.bg } }));

export const Screen = () => (
  <>
    <FlatList contentContainerStyle={styles.content} />
    <ScrollView contentContainerStyle={styles.content} />
  </>
);`,
        errors: [
          { line: 8, column: 15 },
          { line: 9, column: 17 },
        ],
      },
      {
        name: "rt read nested deep inside the style value",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({
  content: { paddingBottom: Math.max(rt.insets.bottom, 16) },
}));

export const List = () => <FlatList contentContainerStyle={styles.content} />;`,
        errors: [{ message: "never subscribes to Unistyles updates" }],
      },
    ],
  },

  "in-sheet": {
    valid: [
      {
        name: "a computed key spelled borderRadius is not that property",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { [borderRadius]: 12 } });`,
      },
      {
        name: "a sheet that already reads rt and theme",
        code: `${IMPORTS}
export const styles = StyleSheet.create((theme, rt) => ({
  container: {
    paddingTop: rt.insets.top,
    width: rt.screen.width,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radii.lg,
    borderCurve: "continuous",
  },
}));`,
      },
      {
        name: "Dimensions.get after the sheet closes",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 } });
const width = Dimensions.get("window").width;`,
      },
      {
        name: "Dimensions.get before the sheet opens",
        code: `${IMPORTS}
const width = Dimensions.get("window").width;
const styles = StyleSheet.create({ container: { flex: 1 } });`,
      },
      {
        name: "a Dimensions.get nested under a different namespace",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { width: RN.Dimensions.get("window").width } });`,
      },
      {
        name: "useColorScheme reached through a member expression",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { opacity: Appearance.useColorScheme() === "dark" ? 1 : 0.5 } });`,
      },
      {
        name: "a Dimensions method that is not get",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: Dimensions.set("window") } });`,
      },
      {
        name: "a PixelRatio method outside the matched pair",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { width: PixelRatio.roundToNearestPixel(10) } });`,
      },
      {
        name: "theme.screen with no trailing segment",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ container: { flex: theme.screen } }));`,
      },
      {
        name: "a bare UnistylesRuntime identifier",
        code: `${IMPORTS}import { UnistylesRuntime } from "react-native-unistyles";

const styles = StyleSheet.create({ container: { flex: has(UnistylesRuntime) ? 1 : 0 } });`,
      },
      {
        name: "destructuring the injected mini runtime",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => {
  const { insets } = rt;
  return { container: { paddingTop: insets.top } };
});`,
      },
      {
        name: "an object pattern initialised from a call rather than an identifier",
        code: `${IMPORTS}
const styles = StyleSheet.create(() => {
  const { insets } = getRuntime();
  return { container: { paddingTop: insets.top } };
});`,
      },
      {
        name: "UnistylesRuntime assigned to a plain identifier binding",
        code: `${IMPORTS}import { UnistylesRuntime } from "react-native-unistyles";

const styles = StyleSheet.create(() => {
  const runtime = UnistylesRuntime;
  return { container: { flex: has(runtime) ? 1 : 0 } };
});`,
      },
      {
        name: "an as-cast to a named type other than const",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: value as FlexValue } });`,
      },
      {
        name: "an as-cast to a keyword type",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: value as number } });`,
      },
      {
        name: "borderRadius paired with borderCurve",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { borderRadius: 12, borderCurve: "continuous" } });`,
      },
      {
        name: "borderCurve declared before borderRadius",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { borderCurve: "continuous", borderRadius: 12 } });`,
      },
      {
        name: "borderCurve alone",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { borderCurve: "continuous" } });`,
      },
      {
        name: "logical padding properties",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { paddingStart: 8, paddingEnd: 8, marginStart: 4, marginEnd: 4 } });`,
      },
      {
        name: "paddingLeft fed from rt.insets.left",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({ card: { paddingLeft: rt.insets.left } }));`,
      },
      {
        name: "marginRight fed from rt.insets.right",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({ card: { marginRight: rt.insets.right } }));`,
      },
      {
        name: "paddingRight wrapping rt.insets.right in an expression",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({ card: { paddingRight: Math.max(rt.insets.right, 8) } }));`,
      },
      {
        name: "boxShadow instead of the legacy shadow props",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" } });`,
      },
      {
        name: "I18nManager members other than isRTL",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { flex: I18nManager.getConstants().isRTL ? 1 : 0 } });`,
      },
      {
        name: "rt.rtl is the sanctioned RTL read",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({ card: { flexDirection: rt.rtl ? "row-reverse" : "row" } }));`,
      },
      {
        name: "StatusBar members other than currentHeight",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { flex: StatusBar.setHidden ? 1 : 0 } });`,
      },
      {
        name: "every banned pattern outside the sheet in a file that has one",
        code: `${IMPORTS}import { UnistylesRuntime } from "react-native-unistyles";

const styles = StyleSheet.create({ card: { flex: 1 } });
const width = Dimensions.get("window").width;
const ratio = PixelRatio.get();
const scale = PixelRatio.getFontScale();
const mode = Appearance.getColorScheme();
const rtl = I18nManager.isRTL;
const bar = StatusBar.currentHeight;
const uni = UnistylesRuntime.screen.width;
const { insets } = UnistylesRuntime;
const literal = "x" as const;`,
      },
      {
        name: "a computed key whose identifier is not a style name",
        code: `${IMPORTS}
const key = "borderRadius";
const styles = StyleSheet.create({ card: { [key]: 8 } });`,
      },
      {
        name: "an object literal outside the sheet with a lone borderRadius",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { flex: 1 } });
const fallback = { borderRadius: 12 };`,
      },
    ],
    invalid: [
      {
        name: "a line-split StyleSheet.create is still a sheet",
        code: `${IMPORTS}
const styles = StyleSheet
  .create({ card: { borderRadius: 12 } });`,
        errors: [{ message: "borderCurve" }],
      },
      {
        name: "Dimensions.get inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { width: Dimensions.get("window").width } });`,
        errors: [{ message: "reactive `rt.screen`", line: 4, column: 56 }],
      },
      {
        name: "PixelRatio.get inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { borderWidth: 1 / PixelRatio.get() } });`,
        errors: [{ message: "`rt.pixelRatio`", line: 4 }],
      },
      {
        name: "PixelRatio.getFontScale inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { fontSize: 16 * PixelRatio.getFontScale() } });`,
        errors: [{ message: "`rt.fontScale`" }],
      },
      {
        name: "Appearance.getColorScheme inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { opacity: Appearance.getColorScheme() === "dark" ? 1 : 0.5 } });`,
        errors: [{ message: "`rt.colorScheme`" }],
      },
      {
        name: "a bare useColorScheme call inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { opacity: useColorScheme() === "dark" ? 1 : 0.5 } });`,
        errors: [{ message: "`rt.colorScheme`" }],
      },
      {
        name: "I18nManager.isRTL inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" } });`,
        errors: [{ message: "`rt.rtl`", line: 4, column: 58 }],
      },
      {
        name: "StatusBar.currentHeight inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ header: { paddingTop: StatusBar.currentHeight } });`,
        errors: [{ message: "`rt.statusBar.height`" }],
      },
      {
        name: "a UnistylesRuntime chain reports only on the outermost member",
        code: `${IMPORTS}import { UnistylesRuntime } from "react-native-unistyles";

const styles = StyleSheet.create({ container: { width: UnistylesRuntime.screen.width } });`,
        errors: [{ message: "injected mini runtime", line: 5, column: 56 }],
      },
      {
        name: "a single-segment UnistylesRuntime member",
        code: `${IMPORTS}import { UnistylesRuntime } from "react-native-unistyles";

const styles = StyleSheet.create({ container: { flex: UnistylesRuntime.hasAdaptiveThemes ? 1 : 0 } });`,
        errors: 1,
      },
      {
        name: "destructuring UnistylesRuntime inside the sheet",
        code: `${IMPORTS}import { UnistylesRuntime } from "react-native-unistyles";

const styles = StyleSheet.create(() => {
  const { insets } = UnistylesRuntime;
  return { container: { paddingTop: insets.top } };
});`,
        errors: [{ message: "Destructure from the injected mini runtime", line: 6, column: 9 }],
      },
      {
        name: "theme.screen inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ container: { width: theme.screen.width } }));`,
        errors: [{ message: "module-initialization screen snapshot", line: 4 }],
      },
      {
        name: "a redundant as const inside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { flexDirection: "row" as const } });`,
        errors: [{ message: "Drop `as const`", line: 4, column: 58 }],
      },
      {
        name: "borderRadius with no borderCurve",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { borderRadius: 12, backgroundColor: "red" } });`,
        errors: [{ message: "borderCurve", line: 4, column: 44 }],
      },
      {
        name: "a spread beside borderRadius does not suppress the report",
        code: `${IMPORTS}
const base = { padding: 8 };
const styles = StyleSheet.create({ card: { ...base, borderRadius: 12 } });`,
        errors: [{ message: "borderCurve" }],
      },
      {
        name: "two style objects each missing borderCurve",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: { borderRadius: 12 },
  chip: { borderRadius: 8 },
}));`.replace("}));", "});"),
        errors: [
          { line: 5, column: 11 },
          { line: 6, column: 11 },
        ],
      },
      {
        name: "every legacy shadow property",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: {
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});`,
        errors: [{ line: 6 }, { line: 7 }, { line: 8 }, { line: 9 }, { line: 10 }],
      },
      {
        name: "paddingLeft with a plain number",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { paddingLeft: 12 } });`,
        errors: [{ message: "paddingStart`/`paddingEnd", line: 4, column: 44 }],
      },
      {
        name: "marginLeft and marginRight and paddingRight",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: { marginLeft: 4, marginRight: 4, paddingRight: 8 },
});`,
        errors: 3,
      },
      {
        name: "paddingLeft fed from an inset other than left or right",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({ card: { paddingLeft: rt.insets.top } }));`,
        errors: [{ message: "mirrors in RTL" }],
      },
      {
        name: "a realistic sheet trips several checks at once",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  card: {
    width: Dimensions.get("window").width,
    paddingLeft: 16,
    borderRadius: 12,
    shadowOpacity: 0.2,
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
  },
}));`,
        errors: [{ line: 6 }, { line: 7 }, { line: 8 }, { line: 9 }, { line: 10 }],
      },
      {
        name: "leaving a nested StyleSheet.create restores the outer depth",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: { flex: StyleSheet.create({ inner: { flex: 1 } }) ? 1 : 0, paddingLeft: 8 },
});`,
        errors: [{ message: "mirrors in RTL", line: 5 }],
      },
      {
        name: "a nested StyleSheet.create keeps the depth positive for its own body",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: { flex: StyleSheet.create({ inner: { borderRadius: 4 } }) ? 1 : 0 },
});`,
        errors: [{ message: "borderCurve", line: 5 }],
      },
    ],
  },

  insets: {
    valid: [
      {
        name: "rt.insets inside the sheet with no useSafeAreaInsets anywhere",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({
  container: { paddingTop: rt.insets.top, paddingBottom: rt.insets.bottom },
}));

export const Screen = () => <View style={styles.container} />;`,
      },
      {
        name: "the style call receiver is not a stylesheet",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Screen = () => {
  const insets = useSafeAreaInsets();
  const resolved = helpers.container(insets.top);
  return <View style={resolved} />;
};`,
      },
      {
        name: "a style call whose text carries no inset word",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: pad => ({ flex: pad }) });

export const Screen = () => {
  const pad = useSafeAreaInsets();
  return <View style={styles.container(pad)} />;
};`,
      },
      {
        name: "a style call with an inset word but no inset binding",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: value => ({ top: value }) });

export const Screen = ({ scrollTop }) => {
  const insets = useSafeAreaInsets();
  return <View style={styles.container(scrollTop)} height={insets.top} />;
};`,
      },
      {
        name: "contentContainerStyle is exempt from the style-call check",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ content: bottom => ({ paddingBottom: bottom }) });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return <FlatList contentContainerStyle={styles.content(insets.bottom)} />;
};`,
      },
      {
        name: "a destructured inset used bare in a style object is not a member read",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Screen = () => {
  const { top } = useSafeAreaInsets();
  return <View style={{ paddingTop: top }} />;
};`,
      },
      {
        name: "an inset member in a style object whose text has no inset word",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Screen = () => {
  const pad = useSafeAreaInsets();
  return <View style={{ flex: pad.value }} />;
};`,
      },
      {
        name: "the style function is called through a plain identifier callee",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const container = top => ({ paddingTop: top });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  const resolved = container(insets.top);
  return <View style={resolved} />;
};`,
      },
      {
        name: "the style call receiver is itself a member expression",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: top => ({ paddingTop: top }) });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  const resolved = sheets.styles.container(insets.top);
  return <View style={resolved} />;
};`,
      },
      {
        name: "the sheet is bound through a destructuring pattern",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const { styles } = { styles: StyleSheet.create({ container: top => ({ paddingTop: top }) }) };

export const Screen = () => {
  const insets = useSafeAreaInsets();
  const resolved = styles.container(insets.top);
  return <View style={resolved} />;
};`,
      },
      {
        name: "an array-pattern binding whose style call carries no inset word",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: value => ({ paddingTop: value }) });

export const Screen = () => {
  const [pad] = useSafeAreaInsets();
  const resolved = styles.container(pad);
  return <View style={resolved} />;
};`,
      },
      {
        name: "a rest-element binding whose style call carries no inset word",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: value => ({ paddingTop: value }) });

export const Screen = () => {
  const { ...rest } = useSafeAreaInsets();
  const resolved = styles.container(rest.value);
  return <View style={resolved} />;
};`,
      },
      {
        name: "useSafeAreaInsets is called but never reaches a style",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: { flex: 1 } });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  console.log(insets.top);
  return <View style={styles.container} />;
};`,
      },
      {
        name: "a style attribute holding only a sheet reference",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create((theme, rt) => ({ container: { paddingTop: rt.insets.top } }));

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return <View style={styles.container} data-top={insets.top} />;
};`,
      },
    ],
    invalid: [
      {
        name: "safe-area values passed into a dynamic style function",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: top => ({ paddingTop: top }) });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return <View style={styles.container(insets.top)} />;
};`,
        errors: [
          { message: "hook-fed inline JSX style object", line: 9, column: 16 },
          { message: "passing `useSafeAreaInsets()` into a style function", line: 9, column: 23 },
        ],
      },
      {
        name: "safe-area values in an inline JSX style object",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} />;
};`,
        errors: [{ message: "hook-fed inline JSX style object", line: 7, column: 16 }],
      },
      {
        name: "a style call outside JSX reports only the call",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: top => ({ paddingTop: top }) });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  const resolved = styles.container(insets.top);
  return <View style={resolved} />;
};`,
        errors: [{ message: "passing `useSafeAreaInsets()` into a style function", line: 9, column: 20 }],
      },
      {
        name: "a destructured inset passed bare into a style call",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: value => ({ paddingTop: value }) });

export const Screen = () => {
  const { top } = useSafeAreaInsets();
  const resolved = styles.container(top);
  return <View style={resolved} />;
};`,
        errors: 1,
      },
      {
        name: "a renamed inset binding still matches",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: value => ({ paddingTop: value }) });

export const Screen = () => {
  const { top: safeTop } = useSafeAreaInsets();
  const resolved = styles.container(safeTop);
  return <View style={resolved} />;
};`,
        errors: 1,
      },
      {
        name: "a nested destructure falls back to the property key as the binding name",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ container: value => ({ paddingTop: value }) });

export const Screen = () => {
  const { bottom: { valueOf } } = useSafeAreaInsets();
  const resolved = styles.container(bottom, valueOf);
  return <View style={resolved} />;
};`,
        errors: 1,
      },
      {
        name: "an attribute other than contentContainerStyle is not exempt",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ footer: top => ({ paddingTop: top }) });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return <FlatList ListFooterComponentStyle={styles.footer(insets.top)} />;
};`,
        errors: 1,
      },
      {
        name: "two inline style objects each report",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return (
    <>
      <View style={{ paddingTop: insets.top }} />
      <View style={{ paddingBottom: insets.bottom }} />
    </>
  );
};`,
        errors: [
          { line: 9, column: 13 },
          { line: 10, column: 13 },
        ],
      },
      {
        name: "an inset member inside a style array",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({ base: { flex: 1 } });

export const Screen = () => {
  const insets = useSafeAreaInsets();
  return <View style={[styles.base, { paddingTop: insets.top }]} />;
};`,
        errors: [{ message: "hook-fed inline JSX style object" }],
      },
      {
        name: "the sheet is declared after the component that uses it",
        code: `${IMPORTS}import { useSafeAreaInsets } from "react-native-safe-area-context";

export const Screen = () => {
  const insets = useSafeAreaInsets();
  const resolved = styles.container(insets.top);
  return <View style={resolved} />;
};

const styles = StyleSheet.create({ container: top => ({ paddingTop: top }) });`,
        errors: 1,
      },
    ],
  },

  "no-hardcoded-color": {
    valid: [
      {
        name: "theme colour tokens",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
}));`,
      },
      {
        name: "a five-digit hex is not a colour",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { testID: "#12345" } });`,
      },
      {
        name: "a seven-digit hex is not a colour",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { testID: "#1234567" } });`,
      },
      {
        name: "a nine-digit hex is not a colour",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { testID: "#123456789" } });`,
      },
      {
        name: "a two-digit hex is not a colour",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { testID: "#ab" } });`,
      },
      {
        name: "non-hex characters after the hash",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "#gggggg" } });`,
      },
      {
        name: "a bare hash",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { testID: "#" } });`,
      },
      {
        name: "named CSS colours are not matched",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "transparent", borderColor: "red" } });`,
      },
      {
        name: "a function name that merely starts with a colour keyword",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "colorful(1)" } });`,
      },
      {
        name: "a colour function that is not at the start of the string",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: " rgb(0, 0, 0)" } });`,
      },
      {
        name: "a colour keyword with no opening parenthesis",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "rgb" } });`,
      },
      {
        name: "a numeric colour literal",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: 0xff0000 } });`,
      },
      {
        name: "a hex colour built from a template literal",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: \`#ffffff\` } });`,
      },
      {
        name: "hex colours outside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { flex: 1 } });
export const BRAND = "#ff0044";
export const OVERLAY = "rgba(0, 0, 0, 0.4)";`,
      },
    ],
    invalid: [
      {
        name: "a hex colour in a line-split sheet",
        code: `${IMPORTS}
const styles = StyleSheet
  .create({ card: { backgroundColor: "#ff0044" } });`,
        errors: 1,
      },
      {
        name: "a three-digit hex",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "#fff" } });`,
        errors: [{ message: "theme.colors", line: 4, column: 61 }],
      },
      {
        name: "a four-digit hex",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "#fff8" } });`,
        errors: 1,
      },
      {
        name: "a six-digit hex",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "#ff0044" } });`,
        errors: 1,
      },
      {
        name: "an eight-digit hex",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "#ff0044cc" } });`,
        errors: 1,
      },
      {
        name: "an uppercase hex",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "#ABCDEF" } });`,
        errors: 1,
      },
      {
        name: "every CSS colour function form",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  a: { backgroundColor: "rgb(0, 0, 0)" },
  b: { backgroundColor: "rgba(0, 0, 0, 0.4)" },
  c: { backgroundColor: "hsl(200, 50%, 50%)" },
  d: { backgroundColor: "hsla(200, 50%, 50%, 0.4)" },
  e: { backgroundColor: "hwb(90 10% 10%)" },
  f: { backgroundColor: "lab(50% 40 30)" },
  g: { backgroundColor: "lch(50% 40 30)" },
  h: { backgroundColor: "oklab(0.5 0.1 0.1)" },
  i: { backgroundColor: "oklch(0.5 0.1 200)" },
  j: { backgroundColor: "color(display-p3 1 0 0)" },
});`,
        errors: 10,
      },
      {
        name: "colour functions are matched case-insensitively",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { backgroundColor: "RGBA(0, 0, 0, 0.4)" } });`,
        errors: 1,
      },
      {
        name: "a hex colour reached through the theme callback body",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  card: { backgroundColor: theme.colors.surface, borderColor: "#e5e5e5" },
}));`,
        errors: [{ line: 5, column: 63 }],
      },
      {
        name: "a hex string in a non-colour property is still reported",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { testID: "#fff" } });`,
        errors: 1,
      },
      {
        name: "several raw colours in one sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderColor: "#000" },
  overlay: { backgroundColor: "rgba(0, 0, 0, 0.4)" },
});`,
        errors: [{ line: 5 }, { line: 5 }, { line: 6 }],
      },
    ],
  },

  "no-hardcoded-spacing": {
    valid: [
      {
        name: "a computed key spelled like a spacing property is not that property",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { [padding]: 16 } });`,
      },
      {
        name: "spacing read from theme tokens",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  card: { padding: theme.spacing.md, gap: theme.spacing.sm, borderRadius: theme.radii.lg },
}));`.replace("theme.radii.lg", "theme.sizing.scale(12)"),
      },
      {
        name: "zero is allowed",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { padding: 0, margin: 0, gap: 0 } });`,
      },
      {
        name: "a sub-unit fraction is allowed",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { padding: 0.5, borderRadius: 0.25 } });`,
      },
      {
        name: "negative zero is allowed",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { marginTop: -0 } });`,
      },
      {
        name: "an indexed theme.spacing scale",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { padding: theme.spacing[4] } }));`,
      },
      {
        name: "theme.sizing.scale with a raw argument",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { fontSize: theme.sizing.scale(16) } }));`,
      },
      {
        name: "theme.spacing.scale with a raw argument",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { lineHeight: theme.spacing.scale(24) } }));`,
      },
      {
        name: "theme.scale with a raw argument",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { gap: theme.scale(8) } }));`,
      },
      {
        name: "arithmetic on a token stays token-derived",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { paddingHorizontal: theme.spacing.md * 2 } }));`,
      },
      {
        name: "a member that merely shares the theme.spacing prefix",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { padding: theme.spacingLegacy } }));`,
      },
      {
        name: "a plain theme.sizing member",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { padding: theme.sizing.lg } }));`,
      },
      {
        name: "a number hosted inside a theme scale call above the property",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: theme.spacing.scale({ padding: 16 }) }));`,
      },
      {
        name: "a negated identifier carries no literal",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { marginTop: -gutter } });`,
      },
      {
        name: "a property outside the spacing and type scale",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { width: 100, height: 44, borderWidth: 1, flex: 1 } });`,
      },
      {
        name: "a numeric string is not a number literal",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { fontSize: "16" } });`,
      },
      {
        name: "a value with no literal at all",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { padding: someVariable } });`,
      },
      {
        name: "spacing numbers outside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { flex: 1 } });
export const layout = { padding: 16, gap: 8 };`,
      },
      {
        name: "shadowOffset numbers are not part of the scale",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { shadowOffset: { width: 0, height: 2 } } });`,
      },
    ],
    invalid: [
      {
        name: "a raw padding value",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { padding: 16 } });`,
        errors: [{ message: "theme.spacing", line: 4, column: 53 }],
      },
      {
        name: "one is the smallest significant number",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { gap: 1 } });`,
        errors: 1,
      },
      {
        name: "a fractional value above one",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { lineHeight: 22.5 } });`,
        errors: 1,
      },
      {
        name: "a negative spacing value reports at the unary expression",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { marginTop: -4 } });`,
        errors: [{ line: 4, column: 55 }],
      },
      {
        name: "the first raw number in an expression is the one reported",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { padding: 4 * 2 } });`,
        errors: [{ line: 4, column: 53 }],
      },
      {
        name: "every radius key in the scale",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
});`,
        errors: 5,
      },
      {
        name: "every gap key in the scale",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { gap: 8, rowGap: 8, columnGap: 8 } });`,
        errors: 3,
      },
      {
        name: "the type scale keys",
        code: `${IMPORTS}
const styles = StyleSheet.create({ label: { fontSize: 16, lineHeight: 24 } });`,
        errors: 2,
      },
      {
        name: "the same number hosted inside a call that is not a theme scale",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: theme.layout.scale({ padding: 16 }) }));`,
        errors: 1,
      },
      {
        name: "a non-token member beside a raw number",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { padding: base.unit + 16 } });`,
        errors: 1,
      },
      {
        name: "a raw number beside a token in the same style",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  card: { padding: theme.spacing.md, marginBottom: 12 },
}));`,
        errors: [{ line: 5, column: 52 }],
      },
      {
        name: "a nested style object reports only the inner property",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { card: { paddingVertical: 20 } } });`,
        errors: 1,
      },
    ],
  },

  "no-margin": {
    valid: [
      {
        name: "a computed identifier key spelled margin is not that property",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { [marginTop]: 4 } });`,
      },
      {
        name: "gap and padding instead of margin",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ row: { gap: theme.spacing.sm, padding: theme.spacing.md } }));`,
      },
      {
        name: "a negative margin is allowed",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { margin: -8 } });`,
      },
      {
        name: "a negated token margin is allowed",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ row: { marginLeft: -theme.spacing.md } }));`,
      },
      {
        name: "a negation nested inside the value is enough",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { marginTop: condition ? -4 : 0 } });`,
      },
      {
        name: "marginInline is not a React Native margin key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { marginInline: 8 } });`,
      },
      {
        name: "a key that merely starts with margin",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { margins: 8, marginTopExtra: 8, marginX: 8 } });`,
      },
      {
        name: "a computed key that is not a plain name",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { [prefix + "margin"]: 8 } });`,
      },
      {
        name: "margins outside the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { flex: 1 } });
export const layout = { margin: 8, marginTop: 4 };`,
      },
    ],
    invalid: [
      {
        name: "a plain margin",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ row: { margin: theme.spacing.md } }));`,
        errors: [{ message: "`gap` on the parent", line: 4, column: 53 }],
      },
      {
        name: "zero is still a margin",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { margin: 0 } });`,
        errors: 1,
      },
      {
        name: "every directional margin key",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  row: {
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 1,
    marginRight: 1,
    marginStart: 1,
    marginEnd: 1,
    marginHorizontal: 1,
    marginVertical: 1,
  },
});`,
        errors: 8,
      },
      {
        name: "a string-literal margin key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { "marginTop": 4 } });`,
        errors: 1,
      },
      {
        name: "a positive margin beside a negative one",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: { marginTop: -4, marginBottom: 4 } });`,
        errors: [{ line: 4, column: 58 }],
      },
      {
        name: "margins in two style objects",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  row: { marginTop: 8 },
  cell: { marginHorizontal: 8 },
});`,
        errors: [
          { line: 5, column: 10 },
          { line: 6, column: 11 },
        ],
      },
    ],
  },

  "no-style-spread": {
    valid: [
      {
        name: "styles composed with an array",
        code: `${IMPORTS}
const styles = StyleSheet.create({ base: { flex: 1 }, active: { opacity: 1 } });

export const Row = ({ isActive }) => <View style={[styles.base, isActive && styles.active]} />;`,
      },
      {
        name: "spreading props rather than styles",
        code: `${IMPORTS}
export const Row = props => <View {...props} extra={{ ...props.rest }} />;`,
      },
      {
        name: "a JSX spread of a stylesheet is not an object spread",
        code: `${IMPORTS}
const styles = StyleSheet.create({ base: { flex: 1 } });

export const Row = () => <View {...styles} />;`,
      },
      {
        name: "an object rest pattern is not a spread element",
        code: `${IMPORTS}
const styles = StyleSheet.create({ base: { flex: 1 }, active: { opacity: 1 } });
const { base, ...restStyles } = styles;

export const Row = () => <View style={base} data-rest={restStyles} />;`,
      },
      {
        name: "the spread argument is a call so it has no identifier base",
        code: `${IMPORTS}
const merged = { ...getStyles().base };`,
      },
      {
        name: "a base that is neither a sheet nor styles-suffixed",
        code: `${IMPORTS}
const theme = { base: { flex: 1 } };
const merged = { ...theme.base };`,
      },
      {
        name: "a singular style suffix does not match",
        code: `${IMPORTS}
const cardStyle = { flex: 1 };
const merged = { ...cardStyle };`,
      },
      {
        name: "a suffix that only contains styles",
        code: `${IMPORTS}
const stylesheet = { base: { flex: 1 } };
const merged = { ...stylesheet };`,
      },
      {
        name: "a destructured StyleSheet.create result is not a tracked sheet",
        code: `${IMPORTS}
const { base } = StyleSheet.create({ base: { flex: 1 } });
const merged = { ...base };`,
      },
      {
        name: "a sheet created by something other than StyleSheet.create",
        code: `${IMPORTS}
const sheet = makeStyles({ base: { flex: 1 } });
const merged = { ...sheet.base };`,
      },
    ],
    invalid: [
      {
        name: "sheet detection is AST-based so a line-split StyleSheet.create still registers",
        code: `${IMPORTS}
const sheet = StyleSheet
  .create({ base: { flex: 1 } });
const merged = { ...sheet.base };`,
        errors: [{ line: 6, column: 18 }],
      },
      {
        name: "spreading a StyleSheet.create result",
        code: `${IMPORTS}
const styles = StyleSheet.create({ base: { flex: 1 } });
const merged = { ...styles.base, opacity: 1 };`,
        errors: [{ message: "Compose styles with an array", line: 5, column: 18 }],
      },
      {
        name: "a tracked sheet whose name does not end in styles",
        code: `${IMPORTS}
const sheet = StyleSheet.create({ base: { flex: 1 } });
const merged = { ...sheet.base };`,
        errors: 1,
      },
      {
        name: "an untracked base whose name ends in Styles",
        code: `${IMPORTS}
const merged = { ...cardStyles.base };`,
        errors: 1,
      },
      {
        name: "an untracked base whose name ends in lowercase styles",
        code: `${IMPORTS}
const merged = { ...styles };`,
        errors: 1,
      },
      {
        name: "a deep member chain resolves to its root identifier",
        code: `${IMPORTS}
const merged = { ...textStyles.body.large };`,
        errors: 1,
      },
      {
        name: "a computed member chain still resolves to its root",
        code: `${IMPORTS}
const merged = { ...textStyles["body"] };`,
        errors: 1,
      },
      {
        name: "an array spread of a styles-suffixed binding",
        code: `${IMPORTS}
const list = [...cardStyles];`,
        errors: [{ line: 4, column: 15 }],
      },
      {
        name: "a call-argument spread of a styles-suffixed binding",
        code: `${IMPORTS}
const flat = merge(...cardStyles);`,
        errors: 1,
      },
      {
        name: "two spreads in one object",
        code: `${IMPORTS}
const styles = StyleSheet.create({ base: { flex: 1 }, active: { opacity: 1 } });
const merged = { ...styles.base, ...styles.active };`,
        errors: [
          { line: 5, column: 18 },
          { line: 5, column: 34 },
        ],
      },
      {
        name: "the sheet is declared after the spread",
        code: `${IMPORTS}
const merged = { ...sheet.base };
const sheet = StyleSheet.create({ base: { flex: 1 } });`,
        errors: 1,
      },
    ],
  },

  "no-unused-styles": {
    valid: [
      {
        name: "every key is read",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export const Row = () => (
  <View style={styles.container}>
    <Text style={styles.label} />
  </View>
);`,
      },
      {
        name: "the sheet is exported as a named declaration",
        code: `${IMPORTS}
export const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });`,
      },
      {
        name: "the sheet is exported through a specifier",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export { styles };`,
      },
      {
        name: "the sheet is exported as default",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export default styles;`,
      },
      {
        name: "the sheet is read with a computed key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export const Row = ({ variant }) => <View style={styles[variant]} />;`,
      },
      {
        name: "the sheet declares a computed key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ [containerKey]: { flex: 1 }, label: { fontWeight: "600" } });

export const Row = () => <View style={styles.label} />;`,
      },
      {
        name: "the sheet spreads a base object",
        code: `${IMPORTS}
const base = { flex: 1 };
const styles = StyleSheet.create({ ...base, label: { fontWeight: "600" } });

export const Row = () => <View />;`,
      },
      {
        name: "an empty-string key makes the whole sheet unreadable",
        code: `${IMPORTS}
const styles = StyleSheet.create({ "": { flex: 1 }, label: { fontWeight: "600" } });

export const Row = () => <View />;`,
      },
      {
        name: "the create result is not assigned to an identifier",
        code: `${IMPORTS}
StyleSheet.create({ container: { flex: 1 } });

export const Row = () => <View />;`,
      },
      {
        name: "the create result is destructured",
        code: `${IMPORTS}
const { container } = StyleSheet.create({ container: { flex: 1 }, label: { flex: 1 } });

export const Row = () => <View style={container} />;`,
      },
      {
        name: "StyleSheet.create is handed a bare identifier",
        code: `${IMPORTS}
const factory = theme => ({ container: { flex: 1 }, label: { flex: 1 } });
const styles = StyleSheet.create(factory);

export const Row = () => <View style={styles.container} />;`,
      },
      {
        name: "a second sheet with a computed key silences the whole file",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, unusedOne: { flex: 1 } });
const extra = StyleSheet.create({ [key]: { flex: 1 } });

export const Row = () => <View style={styles.container} data-extra={extra} />;`,
      },
      {
        name: "an exported default create expression is not tracked",
        code: `${IMPORTS}
export default StyleSheet.create({ container: { flex: 1 }, label: { flex: 1 } });`,
      },
      {
        name: "a sheet whose keys are read through a theme callback body",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  container: { backgroundColor: theme.colors.bg },
  label: { color: theme.colors.text },
}));

export const Row = () => (
  <View style={styles.container}>
    <Text style={styles.label} />
  </View>
);`,
      },
      {
        name: "the sheet is exported under an alias",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export { styles as sheet };`,
      },
      {
        name: "StyleSheet.create reached through a namespace is not tracked",
        code: `${IMPORTS}
const styles = RN.StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export const Row = () => <View style={styles.container} />;`,
      },
      {
        name: "a create on another object and a compose on StyleSheet are both untracked",
        code: `${IMPORTS}
const styles = Sheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });
const composed = StyleSheet.compose({ a: 1 }, { b: 2 });
const real = StyleSheet.create({ used: { flex: 1 } });

export const Row = () => <View style={[styles.container, real.used]} data-c={composed} />;`,
      },
      {
        name: "two sheets that are both fully read",
        code: `${IMPORTS}
const layout = StyleSheet.create({ container: { flex: 1 } });
const text = StyleSheet.create({ label: { fontWeight: "600" } });

export const Row = () => (
  <View style={layout.container}>
    <Text style={text.label} />
  </View>
);`,
      },
    ],
    invalid: [
      {
        name: "an unused key in a line-split sheet",
        code: `${IMPORTS}
const styles = StyleSheet
  .create({ container: { flex: 1 }, unused: { flex: 1 } });

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.unused`" }],
      },
      {
        name: "one unread key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, label: { fontWeight: "600" } });

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.label`", line: 4, column: 60 }],
      },
      {
        name: "two unread keys report in declaration order",
        code: `${IMPORTS}
const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontWeight: "600" },
  badge: { borderRadius: 8 },
});

export const Row = () => <View style={styles.container} />;`,
        errors: [
          { message: "Delete `styles.label`", line: 6, column: 3 },
          { message: "Delete `styles.badge`", line: 7, column: 3 },
        ],
      },
      {
        name: "a string-literal key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, "my-label": { fontWeight: "600" } });

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.my-label`" }],
      },
      {
        name: "a numeric key",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 }, 2: { fontWeight: "600" } });

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.2`" }],
      },
      {
        name: "unread keys in a theme-callback sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({
  container: { backgroundColor: theme.colors.bg },
  label: { color: theme.colors.text },
}));

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.label`", line: 6, column: 3 }],
      },
      {
        name: "a block-bodied theme callback reads what it returns, not a local object",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => {
  const spacing = { gutter: 16 };
  return { container: { padding: spacing.gutter }, unused: { flex: 1 } };
});

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.unused`" }],
      },
      {
        name: "each sheet is tracked independently",
        code: `${IMPORTS}
const layout = StyleSheet.create({ container: { flex: 1 }, spacer: { height: 8 } });
const text = StyleSheet.create({ label: { fontWeight: "600" }, caption: { opacity: 0.6 } });

export const Row = () => (
  <View style={layout.container}>
    <Text style={text.label} />
  </View>
);`,
        errors: [
          { message: "Delete `layout.spacer`", line: 4 },
          { message: "Delete `text.caption`", line: 5 },
        ],
      },
      {
        name: "a function-expression theme factory",
        code: `${IMPORTS}
const styles = StyleSheet.create(function (theme) {
  return { container: { backgroundColor: theme.colors.bg }, label: { color: theme.colors.text } };
});

export const Row = () => <View style={styles.container} />;`,
        errors: [{ message: "Delete `styles.label`" }],
      },
      {
        name: "an export specifier whose local name is not the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 } });
const container = 1;

export { container as styles };`,
        errors: [{ message: "Delete `styles.container`" }],
      },
      {
        name: "a read through a member object rather than a plain identifier does not count",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 } });

export const Row = () => <View style={this.styles.container} />;`,
        errors: [{ message: "Delete `styles.container`" }],
      },
      {
        name: "a read on a different sheet name does not count",
        code: `${IMPORTS}
const layout = StyleSheet.create({ container: { flex: 1 } });
const other = { container: 1 };

export const Row = () => <View style={other.container} />;`,
        errors: [{ message: "Delete `layout.container`" }],
      },
      {
        name: "exporting a different binding does not release the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 } });
export const other = 1;`,
        errors: 1,
      },
      {
        name: "a default export of a different identifier does not release the sheet",
        code: `${IMPORTS}
const styles = StyleSheet.create({ container: { flex: 1 } });
const other = 1;
export default other;`,
        errors: 1,
      },
    ],
  },

  "rtl-style-call": {
    valid: [
      {
        name: "rt.rtl read inside the dynamic style",
        code: `${IMPORTS}
const styles = StyleSheet.create((theme, rt) => ({
  row: { flexDirection: rt.rtl ? "row-reverse" : "row" },
}));

export const Row = () => <View style={styles.row} />;`,
      },
      {
        name: "the receiver is not a stylesheet",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ base: { flex: 1 } });
const helpers = { row: isRtl => ({ flexDirection: isRtl ? "row-reverse" : "row" }) };

export const Row = () => <View style={helpers.row(I18nManager.isRTL)} />;`,
      },
      {
        name: "the call has a plain identifier callee",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ base: { flex: 1 } });
const row = isRtl => ({ flexDirection: isRtl ? "row-reverse" : "row" });

export const Row = () => <View style={row(I18nManager.isRTL)} />;`,
      },
      {
        name: "the innermost enclosing call is not a style call",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(pick(I18nManager.isRTL))} />;`,
      },
      {
        name: "the innermost enclosing call hangs off a non-sheet receiver",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(util.pick(I18nManager.isRTL))} />;`,
      },
      {
        name: "isRTL used outside any call",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: { flex: 1 } });

export const Row = () => <View style={styles.row} data-rtl={I18nManager.isRTL} />;`,
      },
      {
        name: "a different I18nManager member",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(I18nManager.doLeftAndRightSwapInRTL)} />;`,
      },
      {
        name: "an isRTL from another namespace",
        code: `${IMPORTS}
const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(Localization.isRTL)} />;`,
      },
      {
        name: "the sheet comes from a helper",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = makeStyles({ row: dir => ({ flexDirection: dir }) });
const sheet = StyleSheet.create({ base: { flex: 1 } });

export const Row = () => <View style={[sheet.base, styles.row(I18nManager.isRTL)]} />;`,
      },
      {
        name: "a chained member on isRTL puts a non-identifier receiver on the call",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: { flex: 1 } });

export const Row = () => <View style={styles.row} data-rtl={I18nManager.isRTL.toString()} />;`,
      },
    ],
    invalid: [
      {
        name: "isRTL passed into a dynamic style from a line-split sheet",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet
  .create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(I18nManager.isRTL)} />;`,
        errors: 1,
      },
      {
        name: "isRTL passed into a dynamic style call",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(I18nManager.isRTL)} />;`,
        errors: [{ message: "Read `rt.rtl` inside the dynamic style", line: 7, column: 39 }],
      },
      {
        name: "two style calls each report",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }), cell: dir => ({ textAlign: dir }) });

export const Row = () => (
  <View style={styles.row(I18nManager.isRTL)}>
    <Text style={styles.cell(I18nManager.isRTL)} />
  </View>
);`,
        errors: [
          { line: 8, column: 16 },
          { line: 9, column: 18 },
        ],
      },
      {
        name: "one call carrying isRTL twice reports twice on the same node",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: (a, b) => ({ flexDirection: a, textAlign: b }) });

export const Row = () => <View style={styles.row(I18nManager.isRTL, I18nManager.isRTL)} />;`,
        errors: [
          { line: 7, column: 39 },
          { line: 7, column: 39 },
        ],
      },
      {
        name: "the sheet is declared after the call",
        code: `${IMPORTS}import { I18nManager } from "react-native";

export const Row = () => <View style={styles.row(I18nManager.isRTL)} />;

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });`,
        errors: 1,
      },
      {
        name: "isRTL nested in an expression inside the style call",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(I18nManager.isRTL ? "rtl" : "ltr")} />;`,
        errors: 1,
      },
      {
        name: "a style call outside JSX",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });
const resolved = styles.row(I18nManager.isRTL);

export const Row = () => <View style={resolved} />;`,
        errors: [{ line: 6, column: 18 }],
      },
      {
        name: "a computed isRTL access resolves to the same member path",
        code: `${IMPORTS}import { I18nManager } from "react-native";

const styles = StyleSheet.create({ row: dir => ({ flexDirection: dir }) });

export const Row = () => <View style={styles.row(I18nManager["isRTL"])} />;`,
        errors: 1,
      },
    ],
  },

  "theme-screen-component": {
    valid: [
      {
        name: "screen size read from the runtime instead",
        code: `${IMPORTS}
export const Card = () => {
  const { rt } = useUnistyles();
  return <View style={{ width: rt.screen.width }} />;
};`,
      },
      {
        name: "theme.screen inside StyleSheet.create at module scope",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { width: theme.screen.width } }));

export const Card = () => <View style={styles.card} />;`,
      },
      {
        name: "theme.screen inside a StyleSheet.create written in a theme-consuming component",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  const local = StyleSheet.create({ card: { width: theme.screen.width } });
  return <View style={local.card} />;
};`,
      },
      {
        name: "no component destructures a useUnistyles theme",
        code: `${IMPORTS}
export const Card = ({ theme }) => <View style={{ width: theme.screen.width }} />;`,
      },
      {
        name: "theme.screen with no trailing segment",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View data-screen={theme.screen} />;
};`,
      },
      {
        name: "a member whose object shares only the theme prefix",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={{ width: themeSnapshot.screen.width, color: theme.colors.text }} />;
};`,
      },
      {
        name: "theme.screen read at module scope outside any function",
        code: `${IMPORTS}
export const width = theme.screen.width;`,
      },
      {
        name: "the destructuring component is a sibling, not an ancestor",
        code: `${IMPORTS}
export const Header = () => {
  const { theme } = useUnistyles();
  return <View style={{ backgroundColor: theme.colors.bg }} />;
};

export const Card = () => <View style={{ width: theme.screen.width }} />;`,
      },
      {
        name: "the useUnistyles result is bound to an identifier rather than destructured",
        code: `${IMPORTS}
export const Card = () => {
  const unistyles = useUnistyles();
  return <View style={{ width: theme.screen.width }} data-u={unistyles} />;
};`,
      },
      {
        name: "useUnistyles referenced without being called",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles;
  return <View style={{ width: theme.screen.width }} />;
};`,
      },
      {
        name: "the destructure has no theme key",
        code: `${IMPORTS}
export const Card = () => {
  const { rt } = useUnistyles();
  return <View style={{ width: theme.screen.width, top: rt.insets.top }} />;
};`,
      },
    ],
    invalid: [
      {
        name: "theme.screen read in a theme-consuming component",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={{ width: theme.screen.width }} />;
};`,
        errors: [{ message: "module-initialization snapshot", line: 6, column: 32 }],
      },
      {
        name: "the read sits inside a callback the component passes down",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <Button onPress={() => measure(theme.screen.width)} />;
};`,
        errors: [{ line: 6, column: 41 }],
      },
      {
        name: "the destructure lives in a nested component of the enclosing function",
        code: `${IMPORTS}
export const Outer = () => {
  const Inner = () => {
    const { theme } = useUnistyles();
    return <View style={{ backgroundColor: theme.colors.bg }} />;
  };
  return <View style={{ width: theme.screen.width }}><Inner /></View>;
};`,
        errors: [{ line: 9 }],
      },
      {
        name: "a longer chain reports once at the outermost member",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View data-w={theme.screen.width.toString()} />;
};`,
        errors: 1,
      },
      {
        name: "a computed screen segment",
        code: `${IMPORTS}
export const Card = ({ dimension }) => {
  const { theme } = useUnistyles();
  return <View style={{ width: theme.screen[dimension] }} />;
};`,
        errors: 1,
      },
      {
        name: "a bracketed screen segment",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={{ width: theme.screen["width"] }} />;
};`,
        errors: 1,
      },
      {
        name: "the read sits in the computed position of a member expression",
        code: `${IMPORTS}
export const Card = ({ sizes }) => {
  const { theme } = useUnistyles();
  return <View style={{ width: sizes[theme.screen.width] }} />;
};`,
        errors: 1,
      },
      {
        name: "two reads in one component",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={{ width: theme.screen.width, height: theme.screen.height }} />;
};`,
        errors: [
          { line: 6, column: 32 },
          { line: 6, column: 60 },
        ],
      },
      {
        name: "a function declaration component",
        code: `${IMPORTS}
export function Card() {
  const { theme } = useUnistyles();
  return <View style={{ width: theme.screen.width }} />;
}`,
        errors: 1,
      },
      {
        name: "the theme is renamed but the snapshot is still read as theme.screen",
        code: `${IMPORTS}
export const Card = () => {
  const { theme: palette } = useUnistyles();
  return <View style={{ width: theme.screen.width, color: palette.colors.text }} />;
};`,
        errors: 1,
      },
    ],
  },

  "theme-style-attr": {
    valid: [
      {
        name: "theme values resolved inside the stylesheet",
        code: `${IMPORTS}
const styles = StyleSheet.create(theme => ({ card: { backgroundColor: theme.colors.bg } }));

export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={styles.card} accessibilityLabel={theme.name} />;
};`,
      },
      {
        name: "the attribute is contentContainerStyle rather than style",
        code: `${IMPORTS}
export const List = () => {
  const { theme } = useUnistyles();
  return <FlatList contentContainerStyle={{ backgroundColor: theme.colors.bg }} />;
};`,
      },
      {
        name: "the style prop reads a bare theme identifier",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={resolve(theme)} />;
};`,
      },
      {
        name: "a member whose object shares only the theme prefix",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={{ backgroundColor: themed.colors.bg }} label={theme.name} />;
};`,
      },
      {
        name: "no enclosing function destructures a useUnistyles theme",
        code: `${IMPORTS}
export const Card = ({ theme }) => <View style={{ backgroundColor: theme.colors.bg }} />;`,
      },
      {
        name: "a module-scope JSX element with no enclosing function",
        code: `${IMPORTS}
export const element = <View style={{ backgroundColor: theme.colors.bg }} />;`,
      },
      {
        name: "the theme comes from a hook that is not useUnistyles",
        code: `${IMPORTS}import { useTheme } from "@react-navigation/native";

export const Card = () => {
  const { theme } = useTheme();
  return <View style={{ backgroundColor: theme.colors.bg }} />;
};`,
      },
      {
        name: "the destructure has no theme key",
        code: `${IMPORTS}
export const Card = () => {
  const { rt } = useUnistyles();
  return <View style={{ paddingTop: rt.insets.top }} />;
};`,
      },
      {
        name: "the theme-consuming component is a sibling",
        code: `${IMPORTS}
export const Header = () => {
  const { theme } = useUnistyles();
  return <View accessibilityLabel={theme.name} />;
};

export const Card = () => <View style={{ backgroundColor: theme.colors.bg }} />;`,
      },
      {
        name: "a style prop with a plain string value",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style="card" label={theme.name} />;
};`,
      },
    ],
    invalid: [
      {
        name: "an inline style object reading the theme",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={{ backgroundColor: theme.colors.bg }} />;
};`,
        errors: [{ message: "Resolve theme-dependent style values", line: 6, column: 16 }],
      },
      {
        name: "the theme passed into a dynamic style function",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: color => ({ backgroundColor: color }) });

export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={styles.card(theme.colors.bg)} />;
};`,
        errors: [{ line: 8, column: 16 }],
      },
      {
        name: "a theme read inside a style array",
        code: `${IMPORTS}
const styles = StyleSheet.create({ card: { flex: 1 } });

export const Card = () => {
  const { theme } = useUnistyles();
  return <View style={[styles.card, { borderColor: theme.colors.border }]} />;
};`,
        errors: 1,
      },
      {
        name: "the read sits inside a callback the component passes down",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return <List renderItem={() => <View style={{ backgroundColor: theme.colors.bg }} />} />;
};`,
        errors: 1,
      },
      {
        name: "a computed theme access",
        code: `${IMPORTS}
export const Card = ({ tone }) => {
  const { theme } = useUnistyles();
  return <View style={{ backgroundColor: theme["colors"][tone] }} />;
};`,
        errors: 1,
      },
      {
        name: "two style props in one component",
        code: `${IMPORTS}
export const Card = () => {
  const { theme } = useUnistyles();
  return (
    <View style={{ backgroundColor: theme.colors.bg }}>
      <Text style={{ color: theme.colors.text }} />
    </View>
  );
};`,
        errors: [
          { line: 7, column: 11 },
          { line: 8, column: 13 },
        ],
      },
      {
        name: "the theme is renamed but the style still reads a theme member",
        code: `${IMPORTS}
export const Card = () => {
  const { theme: palette } = useUnistyles();
  return <View style={{ backgroundColor: theme.colors.bg }} color={palette.colors.text} />;
};`,
        errors: 1,
      },
      {
        name: "a function declaration component",
        code: `${IMPORTS}
export function Card() {
  const { theme } = useUnistyles();
  return <View style={{ backgroundColor: theme.colors.bg }} />;
}`,
        errors: 1,
      },
      {
        name: "the destructure appears after the JSX in the same function",
        code: `${IMPORTS}
export const Card = () => {
  const render = () => <View style={{ backgroundColor: theme.colors.bg }} />;
  const { theme } = useUnistyles();
  return render();
};`,
        errors: 1,
      },
    ],
  },
});
