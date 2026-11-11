-- migrate:up
-- Look & Piece Capture (PRD 10 Nov 2026, flow 1c): a look that starts as her photograph from
-- Home's Capture is its own kind of look. Its draft offers "Find the pieces" instead of the prompt
-- card, and its picture is the photograph, never drawn by Robes. Widening the check is additive:
-- code and phone builds from before it never write 'capture', and read `source` as free text.
alter table app.looks drop constraint looks_source_check;
alter table app.looks
  add constraint looks_source_check
  check (source in ('wear', 'manual', 'variant', 'generated', 'today', 'travel', 'capture'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
