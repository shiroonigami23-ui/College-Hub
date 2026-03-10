export type Announcement = { id: number; title: string; detail: string; audience: string; posted_at: string }
export type CampusEvent = { id: number; name: string; date: string; venue: string; registration_url: string }
export type Resource = { id: number; name: string; category: string; url: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

async function request<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } })
    if (!res.ok) throw new Error(`Request failed: ${path}`)
    return res.json() as Promise<T>
  } catch {
    return fallback(path) as T
  }
}

export async function fetchAnnouncements() {
  return request<Announcement[]>('/api/announcements')
}

export async function fetchEvents() {
  return request<CampusEvent[]>('/api/events')
}

export async function fetchResources() {
  return request<Resource[]>('/api/resources')
}

function fallback(path: string): Announcement[] | CampusEvent[] | Resource[] {
  if (path === '/api/announcements') {
    return [
      { id: 1, title: 'Welcome to College Hub', detail: 'Connect your backend data source to replace this fallback content.', audience: 'All Students', posted_at: '2026-03-10' }
    ]
  }
  if (path === '/api/events') {
    return [
      { id: 1, name: 'Template Kickoff Session', date: '2026-04-01', venue: 'Main Hall', registration_url: 'https://example.edu/register' }
    ]
  }
  return [
    { id: 1, name: 'Academic Calendar', category: 'Academics', url: 'https://example.edu/calendar' }
  ]
}
