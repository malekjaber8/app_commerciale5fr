import raw from '../data/catalogue.json'
import type { Article, CatalogueData, Category } from '../types'

export const data = raw as unknown as CatalogueData
export const categories: Category[] = data.categories
export const articles: Article[] = data.articles

export const topCategories = categories.filter(c => !c.parentId)
export const childrenOf = (id: string) => categories.filter(c => c.parentId === id)

/** Identifiants de la catégorie et de toutes ses sous-catégories. */
export function categoryScope(id: string): string[] {
  return [id, ...childrenOf(id).map(c => c.id)]
}

export const findArticle = (id: string) => articles.find(a => a.id === id)
export const findCategory = (id: string) => categories.find(c => c.id === id)
