-- migrate:up
-- Which model a look's picture was drawn on, beside `stood_on`'s kind: the catalog cell (`w-r4`,
-- or the cell she built by hand). A re-dress anchors the person to that model's own portrait
-- rather than copying the last picture, which drifted (an aged Robes model, testing 17 Nov). Null
-- on her twin (a re-dress reads her current twin) and for pictures drawn before this column.
alter table app.looks
  add column stood_on_cell text check (char_length(stood_on_cell) between 1 and 64);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
