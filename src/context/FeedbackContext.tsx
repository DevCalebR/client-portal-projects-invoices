/* eslint-disable react-refresh/only-export-components */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { NoticeTone } from '../components/Notice'
import { makeId } from '../utils/format'

export interface FeedbackMessage {
  id: string
  title: string
  message?: string
  tone: NoticeTone
}

interface FeedbackInput {
  title: string
  message?: string
  tone?: NoticeTone
  durationMs?: number
}

interface FeedbackContextType {
  messages: FeedbackMessage[]
  notify: (input: FeedbackInput) => void
  dismiss: (id: string) => void
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined)

export const useFeedback = () => {
  const context = useContext(FeedbackContext)

  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider')
  }

  return context
}

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])

  const notify = useCallback(
    ({ title, message, tone = 'info', durationMs = 5000 }: FeedbackInput) => {
      const id = makeId()

      setMessages((current) => [...current, { id, title, message, tone }])

      if (durationMs <= 0) {
        return
      }

      const timer = window.setTimeout(() => {
        dismiss(id)
      }, durationMs)

      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    },
    [],
  )

  const value = useMemo(
    () => ({
      messages,
      notify,
      dismiss,
    }),
    [messages, notify, dismiss],
  )

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>
}

