import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SecretPageLoading() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6" aria-label="Loading secret">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  )
}

export function SecretPageError({ error, name }: { error: Error; name: string }) {
  const normalized = error.message.toLowerCase()
  const message = normalized.includes('not found') || normalized.includes('not_found')
    ? `Secret "${name}" not found`
    : normalized.includes('permission') || normalized.includes('denied')
      ? 'Permission denied: You are not authorized to view this secret'
      : error.message
  return (
    <Card>
      <CardContent className="pt-6">
        <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
      </CardContent>
    </Card>
  )
}
