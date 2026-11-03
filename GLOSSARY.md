# Robes

Robes is moving its users from the legacy beta app to the new platform app. These are the words for
the environments, data and steps involved in that move.

## Environments

**Legacy beta**:
The original web app at beta.byrobes.com that testers use today. Retired at cutover.
_Avoid_: beta (alone), old app, Railway app

**Marketing site**:
www.byrobes.com: the landing page and waitlist. Not part of the cutover; it stays where it is.
_Avoid_: www app, main

**Staging**:
The platform app at staging.byrobes.com with its own database, where every change lands first.
_Avoid_: test, beta

**Production**:
The platform app at app.byrobes.com, serving real users from the production database.
_Avoid_: prod app, live

## Data

**Production database**:
The one database that legacy beta uses today and production uses after cutover. It holds both the
legacy schema and the app schema.
_Avoid_: beta database, Robes_p0 (as a concept)

**Legacy schema**:
Where legacy beta keeps every user's data. Frozen: its shape no longer changes, and after cutover
nothing writes to it.
_Avoid_: public schema, old tables

**App schema**:
Where the platform keeps every user's data, in staging and production alike. Changed only by
migrations.
_Avoid_: new schema, platform tables

**Migration**:
A numbered, committed change to the app schema, applied the same way to staging and production.
The only way the app schema changes.
_Avoid_: SQL script, schema update, running SQL

**Freeze**:
The point after which the legacy schema takes no more changes, so legacy beta and the platform
stop drifting apart.

## The move

**Cutover**:
The switch from legacy beta to production: every user's data copied into the app schema, their
photos copied, and beta.byrobes.com sent to the platform.
_Avoid_: migration (that word is taken), launch, go-live

**Test copy**:
A full copy of legacy beta data into the app schema before cutover, checked with the founders'
own accounts and thrown away.
_Avoid_: dry run, rehearsal (when meaning this)

**Rehost**:
Copying a user's photos from the legacy image host to the platform's own storage, keeping the
originals.
_Avoid_: image migration

## Accounts

**Tester**:
A legacy beta user carried into production at cutover, with everything they had on beta.
_Avoid_: beta user (after cutover), migrated user

**Review account**:
The one account that signs in with a password instead of an emailed code, for store reviewers and
the founders' testing. It holds demo data, never a real person's.
_Avoid_: test user, demo user, Apple account
