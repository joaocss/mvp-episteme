import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessaoPermitida } from "../../../lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardGestor() {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
  if (!sessao) redirect("/login");
  if (sessao.papel !== "gestor" && sessao.papel !== "admin") redirect("/paineis");
  redirect("/gestor");
}
