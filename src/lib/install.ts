/** Memorise l'evenement d'installation (il peut arriver avant l'affichage de la page de connexion). */
export interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let saved: InstallEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); saved = e as InstallEvent; listeners.forEach(l => l()) })
  window.addEventListener('appinstalled', () => { saved = null; listeners.forEach(l => l()) })
}

export const getInstallEvent = () => saved
export const clearInstallEvent = () => { saved = null; listeners.forEach(l => l()) }
export const onInstallChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
