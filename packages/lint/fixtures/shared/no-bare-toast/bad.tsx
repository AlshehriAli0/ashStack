import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";

export const SaveButton = () => <Button onPress={() => toast.success("Saved")} />;
