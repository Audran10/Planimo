import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from '@/core/components/shared/theme-provider'

export const metadata: Metadata = {
  title: 'Planimo — Gestion locative intelligente',
  description: 'Gérez vos biens immobiliers avec un plan interactif segmenté par IA',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${GeistSans.className} min-h-full flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
