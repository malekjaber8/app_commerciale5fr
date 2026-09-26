import { useEffect, useState } from 'react'

const round = (n: number) => Math.round(n * 1000) / 1000
const show = (n: number) => String(n).replace('.', ',')

/** Lit une quantite saisie : « 2 », « 1.5 » ou « 1,5 ». Renvoie null si vide ou invalide. */
export function parseQty(text: string): number | null {
  const n = parseFloat(text.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? round(n) : null
}

/** Pas des boutons − / + : 1 unite, sans jamais descendre sous 0,5 quand la quantite est decimale. */
export const stepQty = (q: number, dir: 1 | -1) => (dir === 1 ? round(q + 1) : q > 1 ? round(q - 1) : q)

/** Champ quantite : accepte les entiers et les decimaux (1,5 ou 2.5). */
export function QtyInput({ value, onChange, className = '' }: { value: number; onChange: (n: number) => void; className?: string }) {
  const [text, setText] = useState(show(value))

  // Suit la valeur quand elle change depuis l'exterieur (boutons − / +), sans casser la saisie en cours (« 1, »)
  useEffect(() => {
    setText(t => (parseQty(t) === value ? t : show(value)))
  }, [value])

  return (
    <input
      value={text}
      inputMode="decimal"
      aria-label="Quantite"
      className={className}
      onFocus={e => e.target.select()}
      onChange={e => {
        const t = e.target.value
        if (!/^[0-9]*[.,]?[0-9]{0,3}$/.test(t)) return
        setText(t)
        const n = parseQty(t)
        if (n != null) onChange(n)
      }}
      onBlur={() => setText(show(value))}
    />
  )
}
