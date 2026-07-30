-- ════════════════════════════════════════════════════════════════════
-- RLS policies + storage buckets for AI Readiness Assessment v2.
-- Run AFTER `prisma migrate deploy` (Prisma owns the table DDL).
-- Roles come from the auth JWT app_metadata (set on registration / by admins).
-- The service-role key bypasses RLS for privileged server operations.
-- ════════════════════════════════════════════════════════════════════

-- ── Claim helpers ───────────────────────────────────────────────────
create or replace function public.jwt_org_id() returns uuid
  language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid;
$$;

create or replace function public.jwt_role() returns text
  language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'role';
$$;

create or replace function public.is_super_admin() returns boolean
  language sql stable as $$ select public.jwt_role() = 'SUPER_ADMIN'; $$;

create or replace function public.is_org_manager() returns boolean
  language sql stable as $$ select public.jwt_role() in ('SUPER_ADMIN','ORG_ADMIN'); $$;

create or replace function public.is_hr() returns boolean
  language sql stable as $$ select public.jwt_role() in ('SUPER_ADMIN','ORG_ADMIN','HR_ADMIN'); $$;

-- True when the given employee row belongs to the current auth user.
create or replace function public.owns_employee(emp_id uuid) returns boolean
  language sql stable as $$
  select exists (select 1 from employees e where e.id = emp_id and e.user_id = auth.uid());
$$;

-- ── Enable RLS everywhere ───────────────────────────────────────────
alter table organizations         enable row level security;
alter table departments           enable row level security;
alter table employees             enable row level security;
alter table admins                enable row level security;
alter table assessment_categories enable row level security;
alter table assessment_questions  enable row level security;
alter table assessment_sessions   enable row level security;
alter table assessment_answers    enable row level security;
alter table assessment_scores     enable row level security;
alter table readiness_levels      enable row level security;
alter table recommendations       enable row level security;
alter table training_modules      enable row level security;
alter table reports               enable row level security;
alter table certificates          enable row level security;
alter table audit_logs            enable row level security;

-- ── organizations ──────────────────────────────────────────────────
drop policy if exists org_select on organizations;
create policy org_select on organizations for select using (
  public.is_super_admin() or id = public.jwt_org_id()
);
drop policy if exists org_write on organizations;
create policy org_write on organizations for update using (
  public.is_super_admin() or (public.is_org_manager() and id = public.jwt_org_id())
);

-- ── Read-for-members, write-for-managers catalogue tables ───────────
-- departments, assessment_categories, assessment_questions,
-- readiness_levels, recommendations, training_modules
do $$
declare t text;
begin
  foreach t in array array[
    'departments','assessment_categories','assessment_questions',
    'readiness_levels','recommendations','training_modules'
  ] loop
    execute format('drop policy if exists %I_select on %I;', t, t);
    execute format(
      'create policy %I_select on %I for select using (public.is_super_admin() or organization_id = public.jwt_org_id());',
      t, t);
    execute format('drop policy if exists %I_write on %I;', t, t);
    execute format(
      'create policy %I_write on %I for all using (public.is_super_admin() or (public.is_org_manager() and organization_id = public.jwt_org_id())) with check (public.is_super_admin() or (public.is_org_manager() and organization_id = public.jwt_org_id()));',
      t, t);
  end loop;
end $$;

-- ── employees ──────────────────────────────────────────────────────
drop policy if exists emp_select on employees;
create policy emp_select on employees for select using (
  public.is_super_admin()
  or (organization_id = public.jwt_org_id() and (public.is_hr() or user_id = auth.uid()))
);
drop policy if exists emp_insert on employees;
create policy emp_insert on employees for insert with check (
  user_id = auth.uid() or public.is_org_manager()
);
drop policy if exists emp_update on employees;
create policy emp_update on employees for update using (
  public.is_super_admin()
  or (public.is_org_manager() and organization_id = public.jwt_org_id())
  or user_id = auth.uid()
);
drop policy if exists emp_delete on employees;
create policy emp_delete on employees for delete using (
  public.is_super_admin() or (public.is_org_manager() and organization_id = public.jwt_org_id())
);

-- ── admins ─────────────────────────────────────────────────────────
drop policy if exists admin_select on admins;
create policy admin_select on admins for select using (
  public.is_super_admin() or (public.is_org_manager() and organization_id = public.jwt_org_id())
);
drop policy if exists admin_write on admins;
create policy admin_write on admins for all using (
  public.is_super_admin() or (public.is_org_manager() and organization_id = public.jwt_org_id())
) with check (
  public.is_super_admin() or (public.is_org_manager() and organization_id = public.jwt_org_id())
);

-- ── assessment_sessions (owner or HR) ──────────────────────────────
drop policy if exists sess_select on assessment_sessions;
create policy sess_select on assessment_sessions for select using (
  public.is_super_admin()
  or (organization_id = public.jwt_org_id() and (public.is_hr() or public.owns_employee(employee_id)))
);
drop policy if exists sess_write on assessment_sessions;
create policy sess_write on assessment_sessions for all using (
  public.owns_employee(employee_id) or public.is_hr()
) with check (
  public.owns_employee(employee_id) or public.is_hr()
);

-- ── assessment_answers (via session ownership) ─────────────────────
drop policy if exists ans_all on assessment_answers;
create policy ans_all on assessment_answers for all using (
  exists (
    select 1 from assessment_sessions s
    where s.id = session_id
      and (public.owns_employee(s.employee_id) or public.is_hr() or public.is_super_admin())
  )
) with check (
  exists (
    select 1 from assessment_sessions s
    where s.id = session_id and (public.owns_employee(s.employee_id) or public.is_hr())
  )
);

-- ── assessment_scores (owner read; HR read; server writes via service role) ─
drop policy if exists score_select on assessment_scores;
create policy score_select on assessment_scores for select using (
  public.is_super_admin()
  or (organization_id = public.jwt_org_id() and (public.is_hr() or public.owns_employee(employee_id)))
);
drop policy if exists score_write on assessment_scores;
create policy score_write on assessment_scores for all using (
  public.is_hr()
) with check (public.is_hr());

-- ── reports & certificates (owner or HR) ───────────────────────────
drop policy if exists report_select on reports;
create policy report_select on reports for select using (
  public.is_super_admin()
  or (organization_id = public.jwt_org_id() and (public.is_hr() or (employee_id is not null and public.owns_employee(employee_id))))
);
drop policy if exists report_write on reports;
create policy report_write on reports for all using (public.is_hr()) with check (public.is_hr());

drop policy if exists cert_select on certificates;
create policy cert_select on certificates for select using (
  public.is_super_admin()
  or (organization_id = public.jwt_org_id() and (public.is_hr() or public.owns_employee(employee_id)))
);
drop policy if exists cert_write on certificates;
create policy cert_write on certificates for all using (public.is_hr()) with check (public.is_hr());

-- ── audit_logs (managers read; authenticated insert) ───────────────
drop policy if exists audit_select on audit_logs;
create policy audit_select on audit_logs for select using (
  public.is_super_admin() or (public.is_hr() and organization_id = public.jwt_org_id())
);
drop policy if exists audit_insert on audit_logs;
create policy audit_insert on audit_logs for insert with check (auth.uid() is not null);

-- ════════════════════════════════════════════════════════════════════
-- Storage buckets + policies
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values
  ('profile-pictures', 'profile-pictures', true),
  ('org-logos',        'org-logos',        true),
  ('reports',          'reports',          false),
  ('certificates',     'certificates',     false),
  ('evidence',         'evidence',         false)
on conflict (id) do nothing;

-- Public read for avatars & logos; owner-write by folder = auth.uid().
drop policy if exists public_read_assets on storage.objects;
create policy public_read_assets on storage.objects for select using (
  bucket_id in ('profile-pictures','org-logos')
);

drop policy if exists owner_write_avatar on storage.objects;
create policy owner_write_avatar on storage.objects for insert to authenticated with check (
  bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text
);

-- Private buckets (reports/certificates/evidence): only authenticated read;
-- writes handled server-side via the service role (bypasses RLS).
drop policy if exists private_read on storage.objects;
create policy private_read on storage.objects for select to authenticated using (
  bucket_id in ('reports','certificates','evidence')
);
