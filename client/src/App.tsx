export default function App() {
  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100">
      {/* The top padding keeps the title clear of the iPhone notch. */}
      <header className="px-6 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <h1 className="text-3xl font-bold tracking-tight">Memodeum</h1>
        <p className="mt-1 text-sm text-slate-400">Memory trainer</p>
      </header>
    </div>
  );
}
