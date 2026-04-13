import type {
  StateResponse,
  ChatResponse,
  GuestbookListResponse,
  GuestbookEntryResponse,
  LeaderboardEntry,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    const err = new Error(text || `HTTP ${res.status}`)
    ;(err as Error & { status: number }).status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export const api = {
  getState(): Promise<StateResponse> {
    return request('/api/state')
  },

  feed(): Promise<StateResponse> {
    return request('/api/feed', { method: 'POST' })
  },

  play(): Promise<StateResponse> {
    return request('/api/play', { method: 'POST' })
  },

  pet(): Promise<StateResponse> {
    return request('/api/pet', { method: 'POST' })
  },

  chat(message: string): Promise<ChatResponse> {
    return request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
  },

  getGuestbook(page = 1): Promise<GuestbookListResponse> {
    return request(`/api/guestbook?page=${page}`)
  },

  postGuestbook(name: string | null, message: string): Promise<GuestbookEntryResponse> {
    return request('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || undefined, message }),
    })
  },

  getLeaderboard(): Promise<LeaderboardEntry[]> {
    return request('/api/challenge/leaderboard')
  },

  setLeaderboardName(id: number, name: string): Promise<LeaderboardEntry> {
    return request(`/api/challenge/leaderboard/${id}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  },
}
