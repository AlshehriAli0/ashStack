import skia from "../packages/lint/dist/react-native/rules/skia/index.js";
import { moduleTests } from "./harness.js";

moduleTests(skia, {
  "canvas-opaque": {
    valid: [
      {
        name: "opaque driven by platform",
        code: `import { Canvas, Fill } from "@shopify/react-native-skia";
import { Platform } from "react-native";

export const Background = () => (
  <Canvas style={{ flex: 1 }} opaque={Platform.OS === "android"}>
    <Fill color="black" />
  </Canvas>
);
`,
      },
      {
        name: "opaque explicitly false",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Badge = () => <Canvas style={{ width: 24, height: 24 }} opaque={false} />;
`,
      },
      {
        name: "opaque as a boolean-shorthand attribute counts as present",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Badge = () => <Canvas style={{ width: 24, height: 24 }} opaque />;
`,
      },
      {
        name: "renamed import keeps the Canvas suffix and carries an opaque prop",
        code: `import { Canvas as SkiaCanvas } from "@shopify/react-native-skia";

export const Background = () => <SkiaCanvas style={{ flex: 1 }} opaque={false} />;
`,
      },
      {
        name: "a Canvas-suffixed tag that was never imported from skia",
        code: `import { Fill } from "@shopify/react-native-skia";
import { Canvas } from "react-native-canvas";

export const Chart = () => <Canvas style={{ flex: 1 }} />;
`,
      },
      {
        name: "a local component ending in Canvas with no skia import of Canvas",
        code: `import { Fill } from "@shopify/react-native-skia";
import { ChartCanvas } from "../components/chart-canvas";

export const Chart = () => <ChartCanvas style={{ flex: 1 }} />;
`,
      },
      {
        name: "a different skia export aliased to a Canvas-suffixed local",
        code: `import { Group as SurfaceCanvas } from "@shopify/react-native-skia";

export const Layer = () => <SurfaceCanvas style={{ flex: 1 }} />;
`,
      },
      {
        name: "documents current behaviour: Canvas aliased to a name without the suffix is never checked",
        code: `import { Canvas as Surface } from "@shopify/react-native-skia";

export const Background = () => <Surface style={{ flex: 1 }} />;
`,
      },
      {
        name: "documents current behaviour: a namespace import reaches Canvas without registering a local",
        code: `import * as Skia from "@shopify/react-native-skia";

export const Background = () => <Skia.Canvas style={{ flex: 1 }} />;
`,
      },
      {
        name: "documents current behaviour: a default import reaches Canvas without registering a local",
        code: `import Skia from "@shopify/react-native-skia";

export const Background = () => <Skia.Canvas style={{ flex: 1 }} />;
`,
      },
      {
        name: "lowercase host element is not a Canvas",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Chart = () => <canvas width={100} height={100} />;
`,
      },
      {
        name: "a skia import with no Canvas element in the file",
        code: `import { Skia, Group, Fill } from "@shopify/react-native-skia";

export const path = Skia.Path.Make();
`,
      },
      {
        name: "a Canvas element in a file with no skia mention at all",
        code: `import { Canvas } from "../ui/canvas";

export const Chart = () => <Canvas style={{ flex: 1 }} />;
`,
      },
      {
        name: "type-only import of Canvas props still leaves the value import registered",
        code: `import { Canvas } from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";

export const Background = () => <Canvas style={{ flex: 1 }} opaque={false} />;
`,
      },
    ],
    invalid: [
      {
        name: "imported Canvas with no opaque prop",
        code: `import { Canvas, Fill } from "@shopify/react-native-skia";

export const Background = () => (
  <Canvas style={{ flex: 1 }}>
    <Fill color="black" />
  </Canvas>
);
`,
        errors: [{ message: "Add an explicit `opaque` prop", line: 4, column: 3 }],
      },
      {
        name: "self-closing Canvas with no attributes",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Background = () => (
  <Canvas />
);
`,
        errors: [{ message: "opaque={Platform.OS === 'android'}", line: 4, column: 3 }],
      },
      {
        name: "renamed import that keeps the Canvas suffix",
        code: `import { Canvas as SkiaCanvas } from "@shopify/react-native-skia";

export const Background = () => (
  <SkiaCanvas style={{ flex: 1 }} />
);
`,
        errors: [{ line: 4, column: 3 }],
      },
      {
        name: "attribute name is matched case-sensitively",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Background = () => (
  <Canvas style={{ flex: 1 }} Opaque={true} />
);
`,
        errors: [{ line: 4, column: 3 }],
      },
      {
        name: "a spread attribute does not suppress this rule",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Background = props => (
  <Canvas {...props} />
);
`,
        errors: [{ line: 4, column: 3 }],
      },
      {
        name: "a near-miss prop name does not satisfy the requirement",
        code: `import { Canvas } from "@shopify/react-native-skia";

export const Background = () => (
  <Canvas style={{ flex: 1 }} opaqueness={1} />
);
`,
        errors: [{ line: 4, column: 3 }],
      },
      {
        name: "one opaque Canvas and one without report exactly once",
        code: `import { Canvas, Fill } from "@shopify/react-native-skia";

export const Pair = () => (
  <>
    <Canvas style={{ flex: 1 }} opaque={false} />
    <Canvas style={{ flex: 1 }}>
      <Fill color="red" />
    </Canvas>
  </>
);
`,
        errors: [{ line: 6, column: 5 }],
      },
      {
        name: "both a direct and a renamed Canvas report, in source order",
        code: `import { Canvas, Canvas as SkiaCanvas, Fill } from "@shopify/react-native-skia";
import { ChartCanvas } from "../components/chart-canvas";

export const Screen = () => (
  <>
    <Canvas style={{ flex: 1 }} />
    <ChartCanvas style={{ flex: 1 }} />
    <SkiaCanvas style={{ flex: 1 }} />
  </>
);
`,
        errors: [
          { line: 6, column: 5 },
          { line: 8, column: 5 },
        ],
      },
      {
        name: "a Canvas nested inside another component still reports",
        code: `import { Canvas, Fill } from "@shopify/react-native-skia";
import { View } from "react-native";

export const Screen = () => (
  <View style={{ flex: 1 }}>
    <View>
      <Canvas style={{ flex: 1 }}>
        <Fill color="black" />
      </Canvas>
    </View>
  </View>
);
`,
        errors: [{ line: 7, column: 7 }],
      },
    ],
  },
});
