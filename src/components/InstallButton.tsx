import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { clearInstallEvent, getInstallEvent, onInstallChange } from '../lib/install'

/** Bouton « Installer l'application » : n'apparait que si le navigateur estime l'application installable. */
export function InstallButton({ className = '' }: { className?: string }) {
  const [evt, setEvt] = useState(getInstallEvent)
  useEffect(() => onInstallChange(() => setEvt(getInstallEvent())), [])

  if (!evt) return null
  return (
    <button type="button" className={className}
      onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => null); clearInstallEvent() }}>
      <Download size={16} /> Installer l&apos;application
    </button>
  )
}
