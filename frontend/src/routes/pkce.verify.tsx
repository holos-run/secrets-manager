import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getUserManager } from '@/lib/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/pkce/verify')({
  component: PKCEVerify,
})

function PKCEVerify() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const userManager = getUserManager()
        const user = await userManager.signinRedirectCallback()
        const returnTo =
          (user.state as { returnTo?: string } | undefined)?.returnTo ?? '/'
        navigate({ to: returnTo })
      } catch (err) {
        console.error('PKCE verify error:', err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" aria-label="Completing authentication">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-48" />
    </div>
  )
}
