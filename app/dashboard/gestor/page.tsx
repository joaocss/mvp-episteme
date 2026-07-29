import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerToken } from "../../../lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardGestor() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao) redirect("/login");
  if (sessao.papel !== "gestor" && sessao.papel !== "admin") redirect("/paineis");
  redirect("/gestor");
}
