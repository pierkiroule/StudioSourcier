-- Backward-compatible storage for schema 1.0.0 and migrated 1.1.0 projects.
alter table public.projects drop constraint projects_schema_version_check;
alter table public.projects add constraint projects_schema_version_check
  check (schema_version in ('1.0.0', '1.1.0'));
