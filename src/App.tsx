import { HashRouter, Route, Routes } from 'react-router-dom'
import { QuoteProvider } from './store/quote'
import { Layout } from './components/Layout'
import { CataloguePage } from './pages/CataloguePage'
import { QuotePage } from './pages/QuotePage'

// HashRouter : indispensable sur GitHub Pages (pas de reecriture d'URL cote serveur)
export default function App() {
  return (
    <QuoteProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<CataloguePage />} />
            <Route path="devis" element={<QuotePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </QuoteProvider>
  )
}
