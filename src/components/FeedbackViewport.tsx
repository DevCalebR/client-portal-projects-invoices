import { Notice } from './Notice'
import { useFeedback } from '../context/FeedbackContext'

export const FeedbackViewport = () => {
  const { messages, dismiss } = useFeedback()

  if (messages.length === 0) {
    return null
  }

  return (
    <div className="feedback-stack" aria-live="polite" aria-atomic="false">
      {messages.map((message) => (
        <Notice
          key={message.id}
          compact
          title={message.title}
          message={message.message}
          tone={message.tone}
          onDismiss={() => dismiss(message.id)}
        />
      ))}
    </div>
  )
}

