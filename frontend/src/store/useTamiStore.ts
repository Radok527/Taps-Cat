import { create } from 'zustand'
import type { AnimationType } from '../types'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface TamiStore {
  // Live state from WS
  hunger: number
  happy: number
  lastAction: string
  lastActionAt: number   // ms timestamp of last lastAction update
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
  leaderboardId: number | null

  // Animation override
  animationOverride: AnimationType | null
  animationOverrideUntil: number
  /** @deprecated use animationOverride */
  currentAnimation: AnimationType

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
  setChallengeSolved(imageUrl: string, leaderboardId: number): void
  dismissChallenge(): void
  setLeaderboardPosition(pos: number): void
}

export const useTamiStore = create<TamiStore>((set) => ({
  hunger: 70,
  happy: 70,
  lastAction: '',
  lastActionAt: 0,
  visitorCount: 0,
  dailyImagesLeft: 40,

  chatHistory: [],
  messagesLeft: 15,
  isChatOpen: false,
  isChatLoading: false,

  challengeSolved: false,
  challengeImageUrl: null,
  leaderboardPosition: null,
  leaderboardId: null,

  animationOverride: null,
  animationOverrideUntil: 0,
  currentAnimation: 'idle',

  setLiveState({ hunger, happy, lastAction, visitorCount, dailyImagesLeft }) {
    set((s) => ({
      hunger,
      happy,
      visitorCount,
      dailyImagesLeft,
      lastAction,
      lastActionAt: lastAction !== s.lastAction ? Date.now() : s.lastActionAt,
    }))
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
    set({ animationOverride: anim, currentAnimation: anim, animationOverrideUntil: until })
  },

  setChallengeSolved(imageUrl, leaderboardId) {
    set({ challengeSolved: true, challengeImageUrl: imageUrl, leaderboardId })
  },

  dismissChallenge() {
    set({ challengeSolved: false })
  },

  setLeaderboardPosition(pos) {
    set({ leaderboardPosition: pos })
  },
}))
