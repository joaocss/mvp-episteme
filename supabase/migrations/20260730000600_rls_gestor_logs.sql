-- Gestor passa a ter acesso aos logs de auditoria e aos eventos de guardrail
-- de toda a escola (antes restrito a 'admin'/'professor'). Repõe a policy.
drop policy if exists audit_select on auditoria;
create policy audit_select on auditoria
  for select using (escola_id = escola_atual() and papel_atual() in ('admin', 'gestor'));

drop policy if exists guardrail_select on guardrail_eventos;
create policy guardrail_select on guardrail_eventos
  for select using (escola_id = escola_atual() and papel_atual() in ('professor', 'admin', 'gestor'));
