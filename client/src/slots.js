// Must match the server's SLOT_LABELS: same keys, same order (time of day).
export const SLOTS = [
  { key: 'fasting', label: 'Morning (fasting)' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' },
]

export const SLOT_LABELS = Object.fromEntries(
  SLOTS.map(({ key, label }) => [key, label]),
)

export function slotLabel(key) {
  return SLOT_LABELS[key] ?? key
}
