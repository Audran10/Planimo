import { LoginForm } from '@/features/auth/components/login-form'
import { Logo } from '@/core/components/shared/logo'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo mobile uniquement */}
      <div className="lg:hidden mb-8">
        <Logo />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Bon retour</h2>
        <p className="text-muted-foreground">
          Connectez-vous à votre espace Planimo
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
