-- DopRent — Add full-text search vector to dresses (2026-05-26)
--
-- Adds a tsvector column for Postgres full-text search.
-- Replaces application-layer string filtering in listDresses().

alter table dresses
  add column if not exists search_vector tsvector;

update dresses
  set search_vector = to_tsvector(
    'simple',
    coalesce(name, '') || ' ' ||
    coalesce(designer, '') || ' ' ||
    coalesce(boutique_name, '') || ' ' ||
    coalesce(description, '')
  );

create index if not exists dresses_search_idx on dresses using gin(search_vector);

-- Auto-update search_vector on insert/update
create or replace function dresses_search_vector_update() returns trigger as $$
begin
  new.search_vector := to_tsvector(
    'simple',
    coalesce(new.name, '') || ' ' ||
    coalesce(new.designer, '') || ' ' ||
    coalesce(new.boutique_name, '') || ' ' ||
    coalesce(new.description, '')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists dresses_search_vector_trigger on dresses;
create trigger dresses_search_vector_trigger
  before insert or update on dresses
  for each row execute function dresses_search_vector_update();
