# Tailwind CSS Recipes & Design Standards

## 1. Clean Modal / Dialog Overlay

```tsx
export function ModalBackdrop({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-slate-800 animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
```

## 2. Form Input with Label and Error State

```tsx
export function FormField({ label, id, error, helperText, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
          error
            ? 'border-rose-400 bg-rose-50/30 text-rose-900 placeholder-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/20 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-200'
            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-400 focus-visible:border-indigo-600 focus-visible:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600'
        }`}
      />
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-slate-400">{helperText}</span>}
    </div>
  );
}
```

## 3. Badge / Status Pill

```tsx
export function Badge({ variant = 'neutral', children }) {
  const styles = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}
```
