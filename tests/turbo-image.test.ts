import turboImage from "../packages/lint/dist/react-native/rules/turbo-image/index.js";
import { moduleTests } from "./harness.js";

const IMPORT = 'import TurboImage from "react-native-turbo-image";';

moduleTests(turboImage, {
  "require-cache-policy": {
    valid: [
      {
        name: "cachePolicy as a string literal",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} resize={96} cachePolicy="dataCache" />
);
`,
      },
      {
        name: "cachePolicy from an expression",
        code: `${IMPORT}

export const Avatar = ({ uri, policy }) => <TurboImage source={{ uri }} cachePolicy={policy} />;
`,
      },
      {
        name: "cachePolicy as a boolean-shorthand attribute still counts as present",
        code: `${IMPORT}

export const Avatar = ({ uri }) => <TurboImage source={{ uri }} cachePolicy />;
`,
      },
      {
        name: "a spread attribute suppresses the rule even with no cachePolicy",
        code: `${IMPORT}

export const Avatar = props => <TurboImage {...props} />;
`,
      },
      {
        name: "spread in last position also suppresses",
        code: `${IMPORT}

export const Avatar = ({ uri, ...rest }) => <TurboImage source={{ uri }} resize={96} {...rest} />;
`,
      },
      {
        name: "spread of a computed object suppresses",
        code: `${IMPORT}

export const Avatar = ({ uri, big }) => <TurboImage source={{ uri }} {...(big ? { resize: 300 } : {})} />;
`,
      },
      {
        name: "a react-native Image in a file that mentions TurboImage",
        code: `${IMPORT}
import { Image } from "react-native";

export const Avatar = ({ uri }) => <Image source={{ uri }} />;
`,
      },
      {
        name: "tag name only contains TurboImage, does not end with it",
        code: `${IMPORT}

export const Row = ({ uri }) => <TurboImageList source={{ uri }} />;
`,
      },
      {
        name: "tag casing differs so the suffix does not match",
        code: `${IMPORT}

export const Avatar = ({ uri }) => <Turboimage source={{ uri }} />;
`,
      },
      {
        name: "documents current behaviour: a namespaced cachePolicy attribute is accepted",
        code: `${IMPORT}

export const Avatar = ({ uri }) => <TurboImage source={{ uri }} data:cachePolicy="dataCache" />;
`,
      },
      {
        name: "closing tag alone never reports",
        code: `${IMPORT}

export const Card = ({ uri }) => (
  <TurboImage source={{ uri }} cachePolicy="dataCache">
    <Overlay />
  </TurboImage>
);
`,
      },
    ],
    invalid: [
      {
        name: "plain TurboImage with a source and no cachePolicy",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} resize={96} />
);
`,
        errors: [{ message: 'cachePolicy="dataCache"', line: 4, column: 4 }],
      },
      {
        name: "no attributes at all",
        code: `${IMPORT}

export const Avatar = () => (
  <TurboImage />
);
`,
        errors: [{ message: "re-fetches over the network", line: 4, column: 4 }],
      },
      {
        name: "member-expression tag reports on its last segment",
        code: `${IMPORT}
import Animated from "react-native-reanimated";

const AnimatedTurbo = Animated.createAnimatedComponent(TurboImage);

export const Avatar = ({ uri }) => (
  <Animated.TurboImage source={{ uri }} />
);
`,
        errors: [{ line: 7, column: 4 }],
      },
      {
        name: "a locally named wrapper ending in TurboImage is treated as one",
        code: `import { MyTurboImage } from "../components/my-turbo-image";

export const Avatar = ({ uri }) => (
  <MyTurboImage source={{ uri }} />
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "attribute name is matched case-sensitively",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} cachepolicy="dataCache" />
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "a cachePolicy on a sibling element does not cover this one",
        code: `${IMPORT}

export const Pair = ({ a, b }) => (
  <>
    <TurboImage source={{ uri: a }} cachePolicy="dataCache" />
    <TurboImage source={{ uri: b }} />
  </>
);
`,
        errors: [{ line: 6, column: 6 }],
      },
      {
        name: "every offending element reports exactly once",
        code: `${IMPORT}

export const Grid = ({ a, b, c }) => (
  <>
    <TurboImage source={{ uri: a }} />
    <TurboImage source={{ uri: b }} resize={96} />
    <TurboImage source={{ uri: c }} cachePolicy="dataCache" />
    <MyTurboImage source={{ uri: a }} />
  </>
);
`,
        errors: [
          { line: 5, column: 6 },
          { line: 6, column: 6 },
          { line: 8, column: 6 },
        ],
      },
      {
        name: "an element with children still reports on its opening tag name",
        code: `${IMPORT}

export const Card = ({ uri }) => (
  <TurboImage source={{ uri }}>
    <Overlay />
  </TurboImage>
);
`,
        errors: [{ line: 4, column: 4 }],
      },
    ],
  },

  "require-resize": {
    valid: [
      {
        name: "resize just under the rendered width",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} resize={96} cachePolicy="dataCache" />
);
`,
      },
      {
        name: "resize as a boolean-shorthand attribute counts as present",
        code: `${IMPORT}

export const Avatar = ({ uri }) => <TurboImage source={{ uri }} resize />;
`,
      },
      {
        name: "a spread attribute suppresses the rule even with no resize",
        code: `${IMPORT}

export const Avatar = props => <TurboImage {...props} />;
`,
      },
      {
        name: "spread before an explicit source suppresses",
        code: `${IMPORT}

export const Avatar = ({ uri, ...rest }) => <TurboImage {...rest} source={{ uri }} />;
`,
      },
      {
        name: "a non-TurboImage tag in a file that mentions TurboImage",
        code: `${IMPORT}
import { Image } from "react-native";

export const Avatar = ({ uri }) => <Image source={{ uri }} />;
`,
      },
      {
        name: "suffix must be at the end of the tag name",
        code: `${IMPORT}

export const Row = ({ uri }) => <TurboImageRow source={{ uri }} />;
`,
      },
      {
        name: "only the opening element is inspected, never the closing one",
        code: `${IMPORT}

export const Card = ({ uri }) => (
  <TurboImage source={{ uri }} resize={96} cachePolicy="dataCache">
    <Overlay />
  </TurboImage>
);
`,
      },
      {
        name: "resizeMode is a different attribute but resize is still present",
        code: `${IMPORT}

export const Avatar = ({ uri }) => <TurboImage source={{ uri }} resize={96} resizeMode="cover" />;
`,
      },
    ],
    invalid: [
      {
        name: "cachePolicy set but resize missing",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} cachePolicy="dataCache" />
);
`,
        errors: [{ message: "native decoder downsamples", line: 4, column: 4 }],
      },
      {
        name: "no attributes at all",
        code: `${IMPORT}

export const Avatar = () => (
  <TurboImage />
);
`,
        errors: [{ message: "Add `resize`", line: 4, column: 4 }],
      },
      {
        name: "resizeMode alone does not satisfy resize",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} resizeMode="cover" cachePolicy="dataCache" />
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "attribute name is matched case-sensitively",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} Resize={96} />
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "documents current behaviour: a namespaced resize attribute is not accepted",
        code: `${IMPORT}

export const Avatar = ({ uri }) => (
  <TurboImage source={{ uri }} data:resize={96} cachePolicy="dataCache" />
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "member-expression tag reports on its last segment",
        code: `${IMPORT}
import Animated from "react-native-reanimated";

export const Avatar = ({ uri }) => (
  <Animated.TurboImage source={{ uri }} cachePolicy="dataCache" />
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "a locally named wrapper ending in TurboImage is treated as one",
        code: `import { MyTurboImage } from "../components/my-turbo-image";

export const Avatar = ({ uri }) => (
  <MyTurboImage source={{ uri }} />
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "every offending element reports exactly once",
        code: `${IMPORT}

export const Grid = ({ a, b, c }) => (
  <>
    <TurboImage source={{ uri: a }} />
    <TurboImage source={{ uri: b }} resize={96} />
    <TurboImage source={{ uri: c }} cachePolicy="dataCache" />
    <TurboImage source={{ uri: a }} {...rest} />
  </>
);
`,
        errors: [
          { line: 5, column: 6 },
          { line: 7, column: 6 },
        ],
      },
    ],
  },
});
