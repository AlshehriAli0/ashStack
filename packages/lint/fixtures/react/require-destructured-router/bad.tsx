import { useRouter } from "expo-router";

export const BackButton = () => {
  const router = useRouter();
  return <button type="button" onClick={() => router.back()} />;
};
