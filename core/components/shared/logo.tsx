export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="5" height="12" rx="1" fill="white" fillOpacity="0.9" />
          <rect x="2" y="2" width="10" height="5" rx="1" fill="white" />
          <rect x="2" y="5" width="8" height="2" rx="1" fill="white" fillOpacity="0.6" />
        </svg>
      </div>
      <span className="text-lg font-semibold tracking-tight">planimo</span>
    </div>
  )
}
