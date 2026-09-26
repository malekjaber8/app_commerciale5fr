import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * Confirmations et messages integres a l'application.
 * Remplacent window.confirm / window.alert : dans l'application bureau (Electron, Windows), ces boites natives
 * font perdre le focus clavier de la fenetre, et les champs de saisie deviennent impossibles a remplir.
 */
interface AskOptions { confirmLabel?: string; danger?: boolean }
interface Dialogs {
  ask: (message: string, options?: AskOptions) => Promise<boolean>
  notify: (message: string) => Promise<void>
}

interface Pending { message: string; options: AskOptions; info: boolean; resolve: (ok: boolean) => void }

const Ctx = createContext<Dialogs | null>(null)

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const ask = useCallback((message: string, options: AskOptions = {}) =>
    new Promise<boolean>(resolve => setPending({ message, options, info: false, resolve })), [])
  const notify = useCallback((message: string) =>
    new Promise<void>(resolve => setPending({ message, options: {}, info: true, resolve: () => resolve() })), [])

  const close = (ok: boolean) => { pending?.resolve(ok); setPending(null) }

  useEffect(() => {
    if (!pending) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { pending.resolve(false); setPending(null) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending])

  const value = useMemo(() => ({ ask, notify }), [ask, notify])

  return (
    <Ctx.Provider value={value}>
      {children}
      {pending && (
        <div className="no-print fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4" onClick={() => close(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{pending.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              {pending.info ? (
                <button ref={cancelRef} onClick={() => close(true)} className="rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white">OK</button>
              ) : (
                <>
                  <button ref={cancelRef} onClick={() => close(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={() => close(true)}
                    className={`rounded-xl px-6 py-3 text-sm font-bold text-white ${pending.options.danger === false ? 'bg-navy' : 'bg-red-600'}`}>
                    {pending.options.confirmLabel ?? 'Confirmer'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useDialogs(): Dialogs {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDialogs hors DialogsProvider')
  return ctx
}
