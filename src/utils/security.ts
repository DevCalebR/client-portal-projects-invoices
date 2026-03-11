import { sha256 } from 'js-sha256'

export const hashSecret = async (value: string): Promise<string> => {
  const normalized = value.trim()

  if (!normalized) {
    return ''
  }

  return sha256(normalized)
}
