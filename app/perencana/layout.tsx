import { redirect } from "next/navigation";
import { auth } from "@/auth";
import HeaderNav from "@/components/ui/HeaderNav";

export default async function PerencanaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/masuk");
  if (session.user.role === "KLIEN") redirect("/klien");

  return (
    <div className="min-h-screen">
      <HeaderNav nama={session.user.name ?? ""} peran="Perencana" beranda="/perencana" />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
