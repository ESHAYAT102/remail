import type { Metadata } from "next";
import { KeybindSettings } from "@/components/settings/keybind-settings";

export const metadata: Metadata = { title: "Keyboard shortcut settings" };

export default function Page() {
  return <KeybindSettings />;
}
