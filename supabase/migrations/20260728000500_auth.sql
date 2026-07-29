-- =====================================================================
-- Autenticacao: hook de custom access token + vinculo do aluno pre-cadastrado
-- =====================================================================

-- Injeta escola_id, papel e serie no JWT (usados pelo RLS e pelo gating).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  v_meta   jsonb := coalesce(v_claims->'app_metadata', '{}'::jsonb);
  v_escola uuid;
  v_papel  text;
  v_serie  text;
  v_email  text := lower(coalesce(v_claims->>'email', ''));
  v_uid    uuid := (event->>'user_id')::uuid;
begin
  select u.escola_id, u.papel into v_escola, v_papel
  from public.usuarios u
  where u.auth_id = v_uid or lower(u.email) = v_email
  limit 1;

  if v_escola is not null then
    select t.serie into v_serie
    from public.matriculas m
    join public.turmas t on t.id = m.turma_id
    join public.usuarios u on u.id = m.aluno_id
    where u.auth_id = v_uid or lower(u.email) = v_email
    limit 1;

    v_meta := v_meta || jsonb_build_object(
      'escola_id', v_escola, 'papel', v_papel, 'serie', coalesce(v_serie, '')
    );
    v_claims := jsonb_set(v_claims, '{app_metadata}', v_meta);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- No primeiro login, vincula o usuario pre-cadastrado (pelo email) ao auth.users.
create or replace function public.vincular_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usuarios
     set auth_id = new.id
   where lower(email) = lower(new.email) and auth_id is null;
  return new;
end;
$$;

drop trigger if exists ao_criar_auth_user on auth.users;
create trigger ao_criar_auth_user
  after insert on auth.users
  for each row execute function public.vincular_usuario_auth();
