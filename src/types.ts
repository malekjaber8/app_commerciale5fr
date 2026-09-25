export interface Variant {
  label: string
  price: number | null
  code?: string
  oldPrice?: number
}

export interface Article {
  id: string
  name: string
  desc: string
  categoryId: string
  img: string | null
  gallery: string[]
  video: string | null
  promo: boolean
  oldPrice: number | null
  variants: Variant[]
  priceFrom: number | null
  unit?: string
  badge?: string
  specs?: string[]
}

export interface Category {
  id: string
  label: string
  icon: string
  desc?: string
  parentId?: string
}

export interface CatalogueData {
  generatedAt: string
  categories: Category[]
  articles: Article[]
}

export interface QuoteLine {
  key: string
  articleId: string
  name: string
  variant: string
  unitPrice: number
  qty: number
}
