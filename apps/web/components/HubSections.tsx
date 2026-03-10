import type { Announcement, CampusEvent, Resource } from '@/lib/api'

export function AnnouncementList({ items }: { items: Announcement[] }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-semibold">Announcements</h2>
      <div className="space-y-3">
        {items.map((a) => (
          <article key={a.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-medium">{a.title}</h3>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{a.audience}</span>
            </div>
            <p className="text-sm text-slate-600">{a.detail}</p>
            <p className="mt-1 text-xs text-slate-500">Posted: {a.posted_at}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function EventList({ items }: { items: CampusEvent[] }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-semibold">Upcoming Events</h2>
      <div className="space-y-3">
        {items.map((e) => (
          <article key={e.id} className="rounded-lg border border-slate-200 p-3">
            <h3 className="font-medium">{e.name}</h3>
            <p className="text-sm text-slate-600">{e.date} • {e.venue}</p>
            <a className="mt-1 inline-block text-sm text-blue-700 underline" href={e.registration_url} target="_blank">Register</a>
          </article>
        ))}
      </div>
    </div>
  )
}

export function ResourceList({ items }: { items: Resource[] }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-semibold">Resources</h2>
      <div className="space-y-2">
        {items.map((r) => (
          <a key={r.id} href={r.url} target="_blank" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
            <span>{r.name}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{r.category}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
