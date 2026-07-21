import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useVersion } from '@/queries/version'
import { getAppConfig } from '@/lib/app-config'

export const Route = createFileRoute('/_authenticated/about')({
  component: AboutPage,
})

function formatValue(value: string) {
  return value && value.length > 0 ? value : 'unknown'
}

export function AboutPage() {
  const { data, isLoading, error } = useVersion()
  const { appName } = getAppConfig()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Server Version</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3" aria-label="Loading version information">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-56" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load version info: {error.message}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Version</p>
                <p>{formatValue(data?.version ?? '')}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Git Commit</p>
                <p>{formatValue(data?.gitCommit ?? '')}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Git Tree State</p>
                <p>{formatValue(data?.gitTreeState ?? '')}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Build Date</p>
                <p>{formatValue(data?.buildDate ?? '')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About {appName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>Copyright &copy; 2024&ndash;present Open Infrastructure Services, LLC. All rights reserved.</p>
            <p>Holos is a trademark of Open Infrastructure Services, LLC.</p>
            <p>
              Licensed under the{' '}
              <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Apache License, Version 2.0
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
