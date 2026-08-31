import { ScrollView } from "react-native";

declare const Header: () => JSX.Element;
declare const Footer: () => JSX.Element;

// A handful of static children is what a ScrollView is for.
export const Good = () => (
  <ScrollView>
    <Header />
    <Footer />
  </ScrollView>
);
