import { useRouter } from "expo-router";

export const BackButton = () => {
  const { back } = useRouter();
  return <button type="button" onClick={back} />;
};
