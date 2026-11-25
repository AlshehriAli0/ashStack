import { defineModule } from "../../../lib/module.js";
import { noInlineWorkletSchedule } from "./no-inline-worklet-schedule.js";
import { noJsTimerSchedule } from "./no-js-timer-schedule.js";
import { noRuntimeInRender } from "./no-runtime-in-render.js";
import { noSyncRuntimeCall } from "./no-sync-runtime-call.js";

export default defineModule({
  meta: { name: "@ashstack/worklets" },
  url: import.meta.url,
  packages: ["react-native-worklets"],
  option: "worklets",
  docsWhen: "auto-enabled when `react-native-worklets` is a dependency",
  rules: {
    "no-runtime-in-render": noRuntimeInRender,
    "no-inline-worklet-schedule": noInlineWorkletSchedule,
    "no-sync-runtime-call": noSyncRuntimeCall,
    "no-js-timer-schedule": noJsTimerSchedule,
  },
});
