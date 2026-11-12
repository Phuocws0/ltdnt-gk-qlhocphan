import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

export default function Layout() {
  const [loaded, error] = useFonts([
    {
      fontFamily: "PlusJakartaSans",
      fontDefinitions: [
        { path: PlusJakartaSans_400Regular, weight: 400 },
        { path: PlusJakartaSans_500Medium, weight: 500 },
        { path: PlusJakartaSans_600SemiBold, weight: 600 },
        { path: PlusJakartaSans_700Bold, weight: 700 },
        { path: PlusJakartaSans_800ExtraBold, weight: 800 },
      ],
    },
  ]);
  if (!loaded && !error) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
