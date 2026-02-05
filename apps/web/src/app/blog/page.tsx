"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

export default function BlogPage() {
  // Placeholder blog posts - can be expanded later
  const posts = [
    {
      slug: "understanding-gto-basics",
      title: "Understanding GTO Basics",
      description:
        "Learn the fundamentals of Game Theory Optimal poker strategy and why it matters.",
      date: "2024-01-15",
      readTime: "5 min",
    },
    {
      slug: "preflop-range-construction",
      title: "Preflop Range Construction",
      description:
        "How to build balanced preflop ranges for different positions and stack depths.",
      date: "2024-01-10",
      readTime: "8 min",
    },
    {
      slug: "exploiting-player-types",
      title: "Exploiting Player Types",
      description:
        "Learn when to deviate from GTO and how to adjust against different opponents.",
      date: "2024-01-05",
      readTime: "6 min",
    },
  ];

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground mt-2">
          Poker strategy articles and insights
        </p>
      </div>

      <div className="grid gap-6">
        {posts.map((post) => (
          <Card key={post.slug}>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{post.date}</span>
                <span>•</span>
                <span>{post.readTime} read</span>
              </div>
              <CardTitle className="text-xl">{post.title}</CardTitle>
              <CardDescription>{post.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/learn">
                <Button variant="outline" size="sm">
                  Read in Learn Section
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-muted/50">
        <CardContent className="flex items-center gap-4 py-6">
          <BookOpen className="h-10 w-10 text-primary" />
          <div className="flex-1">
            <h3 className="font-semibold">Looking for more content?</h3>
            <p className="text-sm text-muted-foreground">
              Check out our comprehensive learning guides for in-depth poker
              strategy.
            </p>
          </div>
          <Link href="/learn">
            <Button>View Guides</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
