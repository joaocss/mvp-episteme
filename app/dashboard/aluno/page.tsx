import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessaoPermitida } from "../../../lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardAluno() {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["aluno", "admin"]);
  if (!sessao) redirect("/login");
  if (sessao.papel !== "aluno" && sessao.papel !== "admin") redirect("/paineis");
  redirect("/tutor");
}
