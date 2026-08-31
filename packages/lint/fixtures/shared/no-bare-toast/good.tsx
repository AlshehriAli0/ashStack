import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";

export const SaveButton = () => {
  const { t } = useTranslation();
  return <Button onPress={() => toast.success(t("saved"))} />;
};
