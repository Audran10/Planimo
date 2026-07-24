import { RegisterForm } from '@/features/auth/components/register-form'
import { Logo } from '@/core/components/shared/logo'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo mobile uniquement */}
      <div className="lg:hidden mb-8">
        <Logo />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Créer un compte</h2>
        <p className="text-muted-foreground">
          Commencez à gérer votre patrimoine gratuitement
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}
