/**
 * Credits Display Component
 *
 * Shows current credits status and estimated cost for AI requests
 */

import { Badge } from "@cadhy/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cadhy/ui/card"
import { Progress } from "@cadhy/ui/progress"
import { useEffect } from "react"
import { useCreditsStore } from "@/stores/credits-store"

export function CreditsDisplay() {
  const creditsStore = useCreditsStore()

  // Load credits on mount
  useEffect(() => {
    creditsStore.loadCredits()
  }, [])

  // Regenerate if needed periodically
  useEffect(() => {
    const interval = setInterval(() => {
      creditsStore.regenerateIfNeeded()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const info = creditsStore.getCreditsInfo()

  if (!creditsStore.state) {
    return null
  }

  const percentage = info.dailyLimit > 0 ? (info.available / info.dailyLimit) * 100 : 100
  const isLow = percentage < 20
  const isUnlimited = info.dailyLimit === -1

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Créditos AI</CardTitle>
          <Badge variant={isUnlimited ? "default" : isLow ? "destructive" : "secondary"}>
            {isUnlimited ? "Ilimitado" : `${info.available}/${info.dailyLimit}`}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {isUnlimited
            ? "Plan Enterprise - Sin límites"
            : `1 crédito = $${info.creditValueUSD.toFixed(2)} USD`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isUnlimited && (
          <>
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Usados hoy: {info.usedToday}</span>
              {info.nextRegeneration && (
                <span>
                  Renovación:{" "}
                  {info.nextRegeneration.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </>
        )}
        {isLow && !isUnlimited && (
          <p className="text-xs text-muted-foreground">
            Créditos bajos. Considera usar Ollama Local o agregar tu propia API key.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact credits badge for toolbar/header
 */
export function CreditsBadge() {
  const creditsStore = useCreditsStore()

  useEffect(() => {
    creditsStore.loadCredits()
  }, [])

  const info = creditsStore.getCreditsInfo()

  if (!creditsStore.state || info.dailyLimit === -1) {
    return null
  }

  const percentage = (info.available / info.dailyLimit) * 100
  const isLow = percentage < 20

  return (
    <Badge variant={isLow ? "destructive" : "secondary"} className="text-xs">
      {info.available} créditos
    </Badge>
  )
}
