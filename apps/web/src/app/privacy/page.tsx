"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  const t = useTranslations();

  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2 className="text-lg font-semibold mt-6">1. Information We Collect</h2>
          <p>
            We collect information you provide directly, such as your email address
            when you sign in with Google. We also collect usage data to improve
            your training experience.
          </p>

          <h2 className="text-lg font-semibold mt-6">2. How We Use Your Information</h2>
          <p>
            Your data is used to save your training progress, personalize your
            experience, and improve our service. We do not sell your personal
            information.
          </p>

          <h2 className="text-lg font-semibold mt-6">3. Data Storage</h2>
          <p>
            Your progress data is stored locally in your browser and optionally
            synced to our secure cloud servers (Supabase) when you sign in.
          </p>

          <h2 className="text-lg font-semibold mt-6">4. Cookies</h2>
          <p>
            We use essential cookies for authentication and local storage for
            saving your preferences and training progress.
          </p>

          <h2 className="text-lg font-semibold mt-6">5. Contact</h2>
          <p>
            For privacy-related questions, please contact us through our GitHub
            repository.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
