export interface StateResponse {
  hunger: number
  happy: number
  last_action: string
  messages_left: number
  images_left: number
  visitor_count: number
  maintenance_mode: boolean
}

export interface ChatResponse {
  message: string
  messages_left: number
  daily_images_left: number
  challenge_success: boolean
  image_url: string | null
  leaderboard_id: number | null
}

export interface GuestbookEntry {
  id: number
  name: string
  message: string
  created_at: string
}

export interface GuestbookEntryResponse extends GuestbookEntry {}

export interface GuestbookListResponse {
  entries: GuestbookEntry[]
  total: number
  page: number
  pages: number
}

export interface LeaderboardEntry {
  id: number
  name: string
  messages_needed: number
  image_url: string | null
  created_at: string
}

export type AnimationType = 'idle' | 'happy' | 'eating' | 'playing' | 'sleeping' | 'curious'

export interface WsMessage {
  hunger: number
  happy: number
  last_action: string
  visitor_count: number
  daily_images_left: number
  maintenance_mode: boolean
}
