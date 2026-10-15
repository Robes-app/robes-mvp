-- migrate:up
-- Consents are an audit trail (SEC-84): a change is a new row, never an edit.
create trigger consents_immutable before update on app.consents
  for each row execute function private.forbid_update();

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
