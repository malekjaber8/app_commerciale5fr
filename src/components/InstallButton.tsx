import { useEffect, useState, type ReactNode } from 'react'
import { Download, Share } from 'lucide-react'
import { clearInstallEvent, getInstallEvent, isIOS, isStandalone, onInstallChange } from '../lib/install'
import { Modal } from './ui'

/** Bouton « Installer l'application » : Android/Chrome declenche l'invite native ; sur iPhone (pas d'invite possible), affiche la marche a suivre. */
export function InstallButton({ className = '', label = "Installer l'application", icon }: { className?: string; label?: string; icon?: ReactNode }) {
  const [evt, setEvt] = useState(getInstallEvent)
  const [showIosHelp, setShowIosHelp] = useState(false)
  useEffect(() => onInstallChange(() => setEvt(getInstallEvent())), [])

  if (isStandalone()) return null

  if (evt) {
    return (
      <button type="button" className={className}
        onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => null); clearInstallEvent() }}>
        {icon ?? <Download size={16} />} {label}
      </button>
    )
  }

  if (isIOS()) {
    return (
      <>
        <button type="button" className={className} onClick={() => setShowIosHelp(true)}>
          {icon ?? <Download size={16} />} {label}
        </button>
        {showIosHelp && (
          <Modal title="Installer l'application" onClose={() => setShowIosHelp(false)}>
            <div className="space-y-3 text-sm text-slate-700">
              <p>Sur iPhone, l&apos;installation se fait depuis Safari :</p>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <Share size={20} className="shrink-0 text-navy" />
                <div>1. Appuie sur le bouton <b>Partager</b> en bas de Safari</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">2. Choisis <b>« Sur l&apos;écran d&apos;accueil »</b></div>
              <div className="rounded-xl bg-slate-50 p-3">3. Appuie sur <b>Ajouter</b></div>
              <p className="text-xs text-slate-400">L&apos;application apparaîtra ensuite comme une icône sur ton écran d&apos;accueil, comme une vraie application.</p>
            </div>
          </Modal>
        )}
      </>
    )
  }

  return null
}
