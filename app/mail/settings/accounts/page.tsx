import { redirect } from "next/navigation";
import { mailAccountsHref } from "@/lib/mail/routes";

export default async function AccountsPage({
  searchParams,
}: PageProps<"/mail/settings/accounts">) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") search.set(key, value);
    else for (const item of value ?? []) search.append(key, item);
  }
  const query = search.toString();
  redirect(query ? `${mailAccountsHref}?${query}` : mailAccountsHref);
}
