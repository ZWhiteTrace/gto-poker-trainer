import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Spade,
  Target,
  Brain,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Preflop Mastery",
    description: "Master RFI, 3-bet, and 4-bet ranges with instant feedback and GTO-based evaluation.",
  },
  {
    icon: Brain,
    title: "Understand WHY",
    description: "Don't just memorize frequencies. Learn the logic behind every GTO decision.",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description: "Identify weak spots in your game with detailed analytics and weakness detection.",
  },
  {
    icon: Zap,
    title: "Practice Anywhere",
    description: "Mobile-optimized interface. Train your poker brain during commute or breaks.",
  },
];

const drillTypes = [
  { name: "RFI Drill", description: "Opening ranges from each position", href: "/drill/rfi" },
  { name: "VS RFI", description: "Respond to opens with 3-bet/call/fold", href: "/drill/vs-rfi" },
  { name: "VS 3-Bet", description: "Face 3-bets and make correct decisions", href: "/drill/vs-3bet" },
  { name: "Range Viewer", description: "Explore full GTO ranges visually", href: "/range" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Free GTO Training
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Master <span className="text-primary">GTO Poker</span> Strategy
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Stop guessing, start crushing. Train your preflop decisions with
              instant GTO feedback. Understand the WHY behind every play.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/drill/rfi">
                  Start Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/range">View Ranges</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Why GTO Trainer?
            </h2>
            <p className="text-muted-foreground">
              Built by poker players, for poker players. Focus on understanding, not memorization.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 transition-colors hover:border-primary/50">
                <CardHeader>
                  <feature.icon className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Drill Types Section */}
      <section className="bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Practice Modes
            </h2>
            <p className="text-muted-foreground">
              Comprehensive preflop training covering all common scenarios.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {drillTypes.map((drill) => (
              <Link key={drill.name} href={drill.href}>
                <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Spade className="h-5 w-5 text-primary" />
                      {drill.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{drill.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
              <h2 className="text-3xl font-bold">
                Ready to Level Up Your Game?
              </h2>
              <ul className="flex flex-col gap-2 text-muted-foreground md:flex-row md:gap-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  100% Free to Start
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  No Credit Card Required
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Instant Feedback
                </li>
              </ul>
              <Button size="lg" asChild>
                <Link href="/drill/rfi">
                  Start Free Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
