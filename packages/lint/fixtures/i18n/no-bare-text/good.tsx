import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

export const Greeting = () => {
  const { t } = useTranslation();
  return <Text>{t("greeting")}</Text>;
};
