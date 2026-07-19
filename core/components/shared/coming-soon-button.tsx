'use client'

import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { cn } from '@/core/lib/utils'
import type { ComponentProps, ReactNode } from 'react'

interface ComingSoonButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  icon: ReactNode
  label: string
  message?: string
}

export function ComingSoonButton({
  icon,
  label,
  message,
  className,
  variant = 'outline',
  ...props
}: ComingSoonButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn('cursor-pointer gap-2', className)}
      onClick={() => toast.info(message ?? 'Cette fonctionnalité arrive bientôt')}
      {...props}
    >
      {icon}
      {label}
    </Button>
  )
}
