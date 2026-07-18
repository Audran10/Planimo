import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Planimo</h1>
      <p className="text-muted-foreground">Gestion locative simplifiée</p>
      <div className="flex gap-4">
        <Link href="/login" className="underline">Se connecter</Link>
        <Link href="/register" className="underline">S&apos;inscrire</Link>
      </div>
    </main>
  )
}
