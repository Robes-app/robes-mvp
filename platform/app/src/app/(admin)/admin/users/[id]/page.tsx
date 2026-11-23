import { AdminUserParams } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Heading } from '@robes/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { generationRows, seconds } from '@/components/admin/generations';
import { day, money, when } from '@/components/admin/table';
import {
  Chip,
  Empty,
  Facts,
  Muted,
  Panel,
  Section,
  Tile,
  TileGrid,
  Timeline,
} from '@/components/admin/user-parts';
import { userDetail, userRecords } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { params: Promise<{ id: string }> };

const dot = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ');

// One person, laid out as beta's admin was: who she is and what she did down the left, what she
// owns and made on the right, and the generations behind it all across the foot.
export default async function AdminUser({ params }: Props) {
  const actor = await requireAdmin();
  const parsed = AdminUserParams.safeParse(await params);
  if (!parsed.success) notFound();
  let u: Awaited<ReturnType<typeof userDetail>>;
  let r: Awaited<ReturnType<typeof userRecords>>;
  try {
    [u, r] = await Promise.all([
      userDetail(actor, parsed.data.id),
      userRecords(actor, parsed.data.id),
    ]);
  } catch {
    notFound();
  }
  const p = copy.user.page;
  const f = p.fields;
  const rc = copy.user.records;
  const rating = (n: number | null) =>
    n === null ? rc.ratings.none : n > 0 ? rc.ratings.up : rc.ratings.down;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name;
  const s = u.style;
  const facts: [string, string][] = [
    [f.name, name || copy.empty],
    [f.season, s?.season ?? copy.empty],
    [f.undertone, dot(s?.undertone, s?.contrast && p.contrast(s.contrast)) || copy.empty],
    [f.body, s?.bodyType ?? copy.empty],
    [f.icons, u.styleIcons.join(', ') || copy.empty],
    [f.budget, dot(u.budget, u.annualSpend) || copy.empty],
    [f.instagram, u.instagram ? `@${u.instagram.replace(/^@/, '')}` : copy.empty],
    [f.home, u.homeCity ?? copy.empty],
    [f.timezone, dot(u.timezone, u.locale)],
    [f.consents, dot(...u.consents.filter((c) => c.granted).map((c) => c.kind)) || copy.empty],
    [f.usage, dot(...u.usageToday.map((x) => `${x.metric} ${x.count}`)) || copy.empty],
    ...(u.role ? ([[f.role, u.role]] as [string, string][]) : []),
  ];
  const gens = generationRows(u.jobs, r.calls);
  const g = p.genColumns;

  return (
    <>
      <Link
        href="/admin/users"
        className="inline-flex min-h-11 items-center gap-1 self-start font-sans text-sm text-ink underline-offset-4 hover:underline"
      >
        <Icon name="back" size={14} />
        {copy.user.back}
      </Link>
      <header className="-mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Heading level={1} size="lg">
          {u.firstName || u.name || u.email}
        </Heading>
        <span className="font-sans text-sm text-ink-muted">{u.email}</span>
        <span className="grow" />
        <span className="font-sans text-sm text-ink-muted">
          {dot(
            p.joined(day(u.createdAt, copy.empty)),
            u.onboardedAt ? p.onboarded : p.notOnboarded,
            u.lastActiveAt ? p.lastActive(day(u.lastActiveAt, copy.empty)) : p.neverActive,
          )}
        </span>
        {u.deletion ? (
          <span className="w-full font-sans text-sm text-danger">
            {p.deletion(u.deletion.status, when(u.deletion.requestedAt, copy.empty))}
          </span>
        ) : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={p.profile}>
            <Facts rows={facts} />
          </Section>
          <Section title={p.feedback} count={r.feedback.length}>
            <Timeline
              empty={p.empty.feedback}
              items={r.feedback.map((x) => ({
                key: x.id,
                at: x.createdAt,
                body: (
                  <>
                    <Chip>{rating(x.rating)}</Chip>
                    {x.track || x.subjectType ? <Chip>{x.track ?? x.subjectType}</Chip> : null}
                    {x.note ? <span>{x.note}</span> : null}
                  </>
                ),
              }))}
            />
          </Section>
          <Section title={p.memory} count={r.memory.length}>
            <Timeline
              empty={p.empty.memory}
              items={r.memory.map((m) => ({
                key: m.id,
                at: m.createdAt,
                body: (
                  <>
                    <Chip>{m.kind}</Chip>
                    {m.verdict === null ? null : <Chip>{rating(m.verdict)}</Chip>}
                    {m.text ? <span>{m.text}</span> : null}
                    {m.surface ? <Muted>{m.surface}</Muted> : null}
                  </>
                ),
              }))}
            />
          </Section>
          <Section title={p.brief} count={r.brief.length}>
            <Timeline
              empty={p.empty.brief}
              items={r.brief.map((b) => ({
                key: b.id,
                at: b.createdAt,
                body: (
                  <>
                    <Chip>{dot(b.list, b.state)}</Chip>
                    <span>{b.text}</span>
                    {b.because ? <Muted>{b.because}</Muted> : null}
                  </>
                ),
              }))}
            />
          </Section>
          <Section title={p.activity} count={r.events.length}>
            <Timeline
              empty={p.empty.activity}
              items={r.events.map((e) => ({
                key: e.id,
                at: e.createdAt,
                body: (
                  <>
                    <Chip>{e.eventType}</Chip>
                    {e.meta.length ? (
                      <Muted>{dot(...e.meta.map(([k, v]) => `${k}: ${v}`))}</Muted>
                    ) : null}
                  </>
                ),
              }))}
            />
          </Section>
          <Section title={p.emails} count={r.notifications.length}>
            <Timeline
              empty={p.empty.emails}
              items={r.notifications.map((n) => ({
                key: n.id,
                at: n.sentAt,
                body: (
                  <>
                    <Chip tone={n.status === 'failed' ? 'danger' : undefined}>{n.kind}</Chip>
                    <Muted>{dot(n.channel, n.status)}</Muted>
                  </>
                ),
              }))}
            />
          </Section>
          <Section title={p.receipts} count={r.inbox.length}>
            <Timeline
              empty={p.empty.receipts}
              items={r.inbox.map((i) => ({
                key: i.id,
                at: i.receivedAt,
                body: (
                  <>
                    <Chip>{i.status}</Chip>
                    <span className="font-medium">{i.retailer ?? copy.empty}</span>
                    <Muted>
                      {dot(p.pieces(i.items), i.filed ? p.filed(i.filed, i.filedTo) : null)}
                    </Muted>
                  </>
                ),
              }))}
            />
          </Section>
          <Link
            href={`/admin/audit?userId=${u.id}`}
            className="inline-flex min-h-11 items-center self-start font-sans text-sm text-ink underline underline-offset-4"
          >
            {copy.user.auditTrail}
          </Link>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Section
            title={p.wardrobe}
            count={r.pieceCount}
            note={r.pieces.length < r.pieceCount ? p.newest(r.pieces.length) : undefined}
          >
            {r.pieces.length ? (
              <TileGrid>
                {r.pieces.map((x) => (
                  <Tile
                    key={x.id}
                    src={x.image}
                    title={x.label}
                    meta={dot(x.category, x.brand, x.wears ? p.worn(x.wears) : null)}
                    starred={x.hero}
                  />
                ))}
              </TileGrid>
            ) : (
              <Panel>
                <Empty>{p.empty.wardrobe}</Empty>
              </Panel>
            )}
          </Section>
          {r.wishlist.length ? (
            <Section title={p.wishlist} count={r.wishlist.length}>
              <TileGrid>
                {r.wishlist.map((w) => (
                  <Tile
                    key={w.id}
                    src={w.image}
                    title={w.label}
                    meta={dot(w.brand, w.price, w.bought ? rc.bought : null)}
                  />
                ))}
              </TileGrid>
            </Section>
          ) : null}
          <Section title={p.looks} count={r.looks.length}>
            {r.looks.length ? (
              <TileGrid>
                {r.looks.map((l) => (
                  <Tile
                    key={l.id}
                    src={l.image}
                    title={l.name}
                    meta={dot(
                      l.status,
                      p.pieces(l.pieces),
                      l.proposals ? p.toFind(l.proposals) : null,
                      l.wears ? p.worn(l.wears) : null,
                      day(l.createdAt, copy.empty),
                    )}
                  />
                ))}
              </TileGrid>
            ) : (
              <Panel>
                <Empty>{p.empty.looks}</Empty>
              </Panel>
            )}
          </Section>
          <Section title={p.lookbook} count={r.artifacts.length}>
            <Timeline
              empty={p.empty.lookbook}
              items={r.artifacts.map((a) => ({
                key: a.id,
                at: a.createdAt,
                body: (
                  <>
                    <Chip>{a.type}</Chip>
                    <Link
                      href={`/admin/artifacts/${a.id}`}
                      prefetch={false}
                      className="underline underline-offset-4"
                    >
                      {a.title || a.type}
                    </Link>
                    {a.saved ? null : <Muted>{p.unsaved}</Muted>}
                  </>
                ),
              }))}
            />
          </Section>
        </div>
      </div>

      <Section title={p.generations} count={gens.length} note={p.generationsNote}>
        <Panel>
          {gens.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-sans text-sm text-ink">
                <thead>
                  <tr className="border-b-[0.5px] border-hairline">
                    {[g.when, g.job, g.calls, g.cost].map((h) => (
                      <th key={h} scope="col" className="type-eyebrow px-4 py-2.5 text-ink-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gens.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b-[0.5px] border-hairline align-top last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                        {when(row.at, copy.empty)}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.job ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{row.job.kind}</span>
                            {row.job.status === 'succeeded' ? null : (
                              <Chip tone={row.job.status === 'failed' ? 'danger' : undefined}>
                                {row.job.status}
                              </Chip>
                            )}
                            {row.job.error ? (
                              <span className="text-danger">{row.job.error}</span>
                            ) : null}
                          </div>
                        ) : (
                          <Muted>{p.noJob}</Muted>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {row.calls.map((c) => (
                            <Link
                              key={c.id}
                              href={`/admin/generations/${c.id}`}
                              prefetch={false}
                              className={`relative inline-flex min-h-7 items-center gap-1 rounded-pill border-[0.5px] px-2.5 text-[11px] after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] hover:border-border-control ${
                                c.status === 'ok'
                                  ? 'border-rule-mid text-ink'
                                  : 'border-danger text-danger'
                              }`}
                            >
                              {c.feature}
                              {c.status === 'ok' ? <Icon name="check" size={11} /> : ` ${c.status}`}
                              {seconds(c.latencyMs) ? ` · ${seconds(c.latencyMs)}` : null}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {money(row.costMicros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{p.empty.generations}</Empty>
          )}
        </Panel>
      </Section>
    </>
  );
}
