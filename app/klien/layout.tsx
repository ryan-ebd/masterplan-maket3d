import { redirect } from "next/navigation";
import { auth } from "@/auth";
import HeaderNav from "@/components/ui/HeaderNav";

export default async function KlienLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/masuk");
  if (session.user.role !== "KLIEN") redirect("/perencana");

  return (
    <div className="min-h-screen">
      <HeaderNav nama={session.user.name ?? ""} peran="Klien" beranda="/klien" />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
