"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  const t = useTranslations();

  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert">
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="mt-6 text-lg font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing and using GTO Poker Trainer, you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the service.
          </p>

          <h2 className="mt-6 text-lg font-semibold">2. Description of Service</h2>
          <p>
            GTO Poker Trainer provides educational tools for learning Game Theory Optimal poker
            strategies. The service includes drills, quizzes, and reference materials.
          </p>

          <h2 className="mt-6 text-lg font-semibold">3. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all
            activities under your account. You agree to use the service for lawful purposes only.
          </p>

          <h2 className="mt-6 text-lg font-semibold">4. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the service are owned by GTO Poker Trainer
            and are protected by copyright and other intellectual property laws.
          </p>

          <h2 className="mt-6 text-lg font-semibold">5. Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. We do not
            guarantee that GTO strategies will result in winning at poker. Gambling involves risk.
          </p>

          <h2 className="mt-6 text-lg font-semibold">6. Limitation of Liability</h2>
          <p>
            GTO Poker Trainer shall not be liable for any indirect, incidental, or consequential
            damages arising from your use of the service.
          </p>

          <h2 className="mt-6 text-lg font-semibold">7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service
            after changes constitutes acceptance of the new terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
