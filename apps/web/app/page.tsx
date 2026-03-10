import { fetchAnnouncements, fetchEvents, fetchResources } from '@/lib/api'
import { AnnouncementList, EventList, ResourceList } from '@/components/HubSections'

export default async function HomePage() {
  const [announcements, events, resources] = await Promise.all([
    fetchAnnouncements(),
    fetchEvents(),
    fetchResources()
  ])

  return (
    <main className="min-h-screen bg-gradient-to-b from-hub-900 to-hub-800 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">College Hub</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100/80">
            Centralized campus portal template for announcements, events, resources, and student operations.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <AnnouncementList items={announcements} />
            <EventList items={events} />
          </div>
          <div>
            <ResourceList items={resources} />
          </div>
        </div>
      </section>
    </main>
  )
}
