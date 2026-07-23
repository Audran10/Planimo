import { AlertCircle, FileCheck, XCircle } from 'lucide-react'
import { Badge } from '@/core/components/ui/badge'
import { cn } from '@/core/lib/utils'
import {
  getTenantLeaseStatus,
  type LeaseStatusIconName,
} from '@/features/tenants/lib/tenant-status'

const variantClasses: Record<'success' | 'warning', string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

function LeaseStatusIcon({
  icon,
  className,
}: {
  icon: LeaseStatusIconName
  className?: string
}) {
  if (icon === 'XCircle') return <XCircle className={className} aria-hidden="true" />
  if (icon === 'AlertCircle') return <AlertCircle className={className} aria-hidden="true" />
  return <FileCheck className={className} aria-hidden="true" />
}

export function LeaseStatusBadge({
  tenant,
  className,
}: {
  tenant: Parameters<typeof getTenantLeaseStatus>[0]
  className?: string
}) {
  const status = getTenantLeaseStatus(tenant)

  if (status.variant === 'destructive') {
    return (
      <Badge variant="destructive" className={className}>
        <LeaseStatusIcon icon={status.icon} className="h-3 w-3" />
        {status.label}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn(variantClasses[status.variant], className)}
    >
      <LeaseStatusIcon icon={status.icon} className="h-3 w-3" />
      {status.label}
    </Badge>
  )
}
