-- V0.1: project aggregate; stops and relations are atomic in a validated JSON document.
create table public.projects (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 160),
 schema_version text not null check (schema_version = '1.0.0'),
 document jsonb not null,
 updated_at timestamptz not null default now(),
 constraint document_shape check (
   (jsonb_typeof(document) = 'object'
   and document->>'schemaVersion' = schema_version
   and document->>'id' = id::text
   and document->>'title' = title
   and jsonb_typeof(document->'stops') = 'array'
   and jsonb_typeof(document->'relations') = 'array') is true
 )
);
create index projects_owner_idx on public.projects(owner_id);
alter table public.projects enable row level security;
revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;
create policy projects_select on public.projects for select to authenticated using ((select auth.uid()) = owner_id);
create policy projects_insert on public.projects for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy projects_update on public.projects for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy projects_delete on public.projects for delete to authenticated using ((select auth.uid()) = owner_id);
