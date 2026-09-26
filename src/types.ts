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
  /** Renseignes par les reglages admin (vue admin seulement pour `hidden`). */
  hidden?: boolean
  adjusted?: boolean
}

export interface Settings {
  hiddenIds: string[]
  /** articleId -> libelle de variante -> prix impose par l'admin */
  priceOverrides: Record<string, Record<string, number>>
  /** Variantes (dimensions) ajoutees par l'admin a un article du catalogue : articleId -> variantes */
  extraVariants?: Record<string, Variant[]>
  /** Nom / description modifies par l'admin pour un article du catalogue : articleId -> champs */
  edits?: Record<string, { name?: string; desc?: string }>
  maxDiscountPct: number
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

export type OrderStatus = 'nouvelle' | 'confirmee' | 'livree' | 'annulee'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  nouvelle: 'Nouvelle',
  confirmee: 'Confirmee',
  livree: 'Livree',
  annulee: 'Annulee',
}

export interface DocLine {
  articleId: string
  name: string
  variant: string
  unitPrice: number
  qty: number
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  address: string
  taxId: string
  note: string
  ownerUid: string
  ownerName: string
  createdAt?: { seconds: number; toDate: () => Date } | null
}

export interface OrderDoc {
  id: string
  number: string
  quoteId: string
  clientId: string
  clientName: string
  phone: string
  ownerUid: string
  ownerName: string
  ownerEmail: string
  lines: DocLine[]
  subtotal: number
  discountPct: number
  discount: number
  total: number
  status: OrderStatus
  note: string
  createdAt?: { seconds: number; toDate: () => Date } | null
}

export interface InvoiceDoc {
  id: string
  number: string
  orderId: string
  clientId: string
  clientName: string
  taxId: string
  address: string
  phone: string
  ownerUid: string
  ownerName: string
  lines: DocLine[]
  discount: number
  timbre: number
  totalHT: number
  tva: number
  totalTTC: number
  note: string
  createdAt?: { seconds: number; toDate: () => Date } | null
}
