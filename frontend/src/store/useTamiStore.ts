import { create } from 'zustand'
import type { AnimationType } from '../types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface TamiStore {
  // Live state from WS
  hunger: number
  happy: number
  lastAction: string
  visitorCount: number
  dailyImagesLeft: number

  // Chat
  chatHistory: ChatMessage[]
  messagesLeft: number
  isChatOpen: boolean
  isChatLoading: boolean

  // Challenge
  challengeSolved: boolean
  challengeImageUrl: string | null
  leaderboardPosition: number | null

  // UI
  currentAnimation: AnimationType
  animationOverrideUntil: number

  // Actions
  setLiveState(state: {
    hunger: number
    happy: number
    lastAction: string
    visitorCount: number
    dailyImagesLeft: number
  }): void
  setMessagesLeft(n: number): void
  addChatMessage(msg: ChatMessage): void
  setChatLoading(loading: boolean): void
  toggleChat(): void
  setAnimationOverride(anim: AnimationType, until: number): void
  setChallengeSolved(imageUrl: string): void
  dismissChallenge(): void
  setLeaderboardPosition(pos: number): void
}

export const useTamiStore = create<TamiStore>((set) => ({
  hunger: 70,
  happy: 70,
  lastAction: '',
  visitorCount: 0,
  dailyImagesLeft: 40,

  chatHistory: [],
  messagesLeft: 15,
  isChatOpen: false,
  isChatLoading: false,

  challengeSolved: false,
  challengeImageUrl: null,
  leaderboardPosition: null,

  currentAnimation: 'idle',
  animationOverrideUntil: 0,

  setLiveState({ hunger, happy, lastAction, visitorCount, dailyImagesLeft }) {
    set({ hunger, happy, lastAction, visitorCount, dailyImagesLeft })
  },

  setMessagesLeft(n) {
    set({ messagesLeft: n })
  },

  addChatMessage(msg) {
    set((s) => ({ chatHistory: [...s.chatHistory, msg] }))
  },

  setChatLoading(loading) {
    set({ isChatLoading: loading })
  },

  toggleChat() {
    set((s) => ({ isChatOpen: !s.isChatOpen }))
  },

  setAnimationOverride(anim, until) {
    set({ currentAnimation: anim, animationOverrideUntil: until })
  },

  setChallengeSolved(imageUrl) {
    set({ challengeSolved: true, challengeImageUrl: imageUrl })
  },

  dismissChallenge() {
    set({ challengeSolved: false })
  },

  setLeaderboardPosition(pos) {
    set({ leaderboardPosition: pos })
  },
}))
