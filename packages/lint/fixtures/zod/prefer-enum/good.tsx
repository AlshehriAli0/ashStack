import { View } from "react-native";
import { z } from "zod";

enum AlertType {
  LowMoisture = "LOW_MOISTURE",
  MissedDelivery = "MISSED_DELIVERY",
}

export const alertTypeSchema = z.enum(AlertType);

export const statusSchema = z.enum(["draft", "published"]);

export const mixedUnion = z.union([z.literal("manual"), z.number()]);

export const Panel = () => <View />;
