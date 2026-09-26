import { useCallback } from 'react'
import type { Article } from '../types'
import { useSettings } from '../store/settings'
import { useDialogs } from '../components/Dialogs'
import { deleteProduct, isCustomId } from './products'

/**
 * Suppression d'un article par l'admin (application bureau).
 * - article ajoute par l'admin : supprime definitivement ;
 * - article du catalogue du site : retire de l'application (masque) sans toucher au site officiel ; l'admin peut le re-afficher.
 * Renvoie true si l'article a ete retire.
 */
export function useRemoveArticle() {
  const { settings, save } = useSettings()
  const { ask, notify } = useDialogs()

  return useCallback(async (article: Article): Promise<boolean> => {
    try {
      if (isCustomId(article.id)) {
        if (!(await ask(`Supprimer definitivement « ${article.name} » ?`, { confirmLabel: 'Supprimer' }))) return false
        await deleteProduct(article.id.slice(7))
        return true
      }
      if (!(await ask(
        `Supprimer « ${article.name} » de l'application ?\n\nIl disparait pour les commerciaux. Le site officiel n'est pas touche. Vous pouvez le re-afficher plus tard (bouton « Masque » sur sa fiche, ou onglet Contenu et prix).`,
        { confirmLabel: 'Supprimer' }))) return false
      if (!settings.hiddenIds.includes(article.id)) await save({ ...settings, hiddenIds: [...settings.hiddenIds, article.id] })
      return true
    } catch {
      await notify('Suppression impossible. Verifiez la connexion.')
      return false
    }
  }, [settings, save, ask, notify])
}
