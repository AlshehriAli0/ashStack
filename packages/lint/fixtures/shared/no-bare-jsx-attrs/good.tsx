import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";

export const NameField = () => {
  const { t } = useTranslation();
  return <TextInput placeholder={t("name")} />;
};
