"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDrillStore } from "@/stores/drillStore";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RotateCcw } from "lucide-react";

const POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB"];

export default function RFIDrillPage() {
  const {
    currentSpot,
    lastResult,
    isLoading,
    error,
    sessionStats,
    generateSpot,
    submitAnswer,
    resetSession,
  } = useDrillStore();

  useEffect(() => {
    // Generate first spot on mount
    if (!currentSpot && !isLoading) {
      generateSpot();
    }
  }, []);

  const handleAction = async (action: string) => {
    await submitAnswer(action);
  };

  const handleNextSpot = () => {
    generateSpot();
  };

  const accuracy = sessionStats.total > 0
    ? Math.round(((sessionStats.correct + sessionStats.acceptable) / sessionStats.total) * 100)
    : 0;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RFI Drill</h1>
          <p className="text-muted-foreground">
            Practice opening ranges from each position
          </p>
        </div>
        <Button variant="outline" onClick={resetSession}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{sessionStats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {sessionStats.correct}
            </div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{accuracy}%</div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {sessionStats.streak}
            </div>
            <div className="text-sm text-muted-foreground">Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Drill Area */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What's Your Play?</CardTitle>
          <CardDescription>
            Choose the correct action for this hand
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          )}

          {isLoading && !currentSpot ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentSpot ? (
            <div className="space-y-6">
              {/* Hand & Position Display */}
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-6xl font-bold">{currentSpot.hand}</div>
                  <div className="mt-2 text-muted-foreground">Your Hand</div>
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {currentSpot.hero_position}
                  </Badge>
                  <div className="mt-2 text-muted-foreground">Position</div>
                </div>
              </div>

              {/* Result Display */}
              {lastResult && (
                <div
                  className={`rounded-lg p-4 ${
                    lastResult.is_correct
                      ? "bg-green-500/10 border border-green-500/20"
                      : lastResult.is_acceptable
                      ? "bg-yellow-500/10 border border-yellow-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.is_correct ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-semibold text-green-500">Correct!</span>
                      </>
                    ) : lastResult.is_acceptable ? (
                      <>
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <span className="font-semibold text-yellow-500">Acceptable</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-500">Incorrect</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm">
                    GTO: <strong>{lastResult.correct_action}</strong> ({lastResult.frequency}%)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lastResult.explanation_zh || lastResult.explanation}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!lastResult ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {currentSpot.available_actions.map((action) => (
                    <Button
                      key={action}
                      size="lg"
                      variant={action === "raise" ? "default" : "outline"}
                      onClick={() => handleAction(action)}
                      disabled={isLoading}
                      className="h-16 text-lg capitalize"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        action
                      )}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleNextSpot}
                  className="w-full h-16 text-lg"
                >
                  Next Hand →
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Click below to start
              <Button onClick={generateSpot} className="mt-4 block mx-auto">
                Start Drill
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Position Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Position Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((pos) => (
              <Badge
                key={pos}
                variant={currentSpot?.hero_position === pos ? "default" : "secondary"}
              >
                {pos}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
