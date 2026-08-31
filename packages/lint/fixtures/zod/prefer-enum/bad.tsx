import { View } from "react-native";
import { z } from "zod";

enum AlertType {
  LowMoisture = "LOW_MOISTURE",
  MissedDelivery = "MISSED_DELIVERY",
}

export const alertTypeSchema = z.nativeEnum(AlertType);

export const statusSchema = z.union([z.literal("draft"), z.literal("published")]);

export const Panel = () => <View />;
