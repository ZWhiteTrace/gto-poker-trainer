import Link from "next/link";
import { Spade } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <Spade className="h-6 w-6 text-primary" />
              <span className="font-bold">GTO Trainer</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Master GTO poker strategy with AI-powered training.
            </p>
          </div>

          {/* Practice */}
          <div>
            <h3 className="font-semibold">Practice</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/drill/rfi" className="hover:text-primary">
                  RFI Drill
                </Link>
              </li>
              <li>
                <Link href="/drill/vs-rfi" className="hover:text-primary">
                  VS RFI
                </Link>
              </li>
              <li>
                <Link href="/drill/vs-3bet" className="hover:text-primary">
                  VS 3-Bet
                </Link>
              </li>
              <li>
                <Link href="/range" className="hover:text-primary">
                  Range Viewer
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="font-semibold">Learn</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/learn" className="hover:text-primary">
                  GTO Basics
                </Link>
              </li>
              <li>
                <Link href="/quiz" className="hover:text-primary">
                  Equity Quiz
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GTO Poker Trainer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
