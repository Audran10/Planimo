import { ThemeToggle } from '@/core/components/shared/theme-toggle'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header minimaliste */}
      <header className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </header>

      {/* Contenu centré */}
      <div className="flex min-h-screen">
        {/* Panneau gauche — branding (caché sur mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary/5 border-r border-border flex-col justify-between p-12">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <span className="font-semibold text-lg">planimo</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">
              Gérez votre patrimoine<br />
              <span className="text-primary">intelligemment</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Plans interactifs, gestion locative et suivi technique en un seul endroit.
            </p>
          </div>

          {/* Testimonial fictif */}
          <div className="bg-background rounded-xl p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-4">
              &ldquo;Planimo nous a fait gagner des heures chaque mois sur la gestion de nos 22 appartements.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">MB</span>
              </div>
              <div>
                <p className="text-sm font-medium">Marc Bernard</p>
                <p className="text-xs text-muted-foreground">SCI Patrimoine Bernard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panneau droit — formulaire */}
        <div id="main-content" className="flex-1 flex items-center justify-center p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
