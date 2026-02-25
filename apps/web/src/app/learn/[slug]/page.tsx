import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getGuide,
  getAllGuides,
  getAdjacentGuidesInCategory,
  type GuideMetadata,
} from "@/lib/guides";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE_URL = "https://grindgto.com";

const categoryLabels: Record<string, string> = {
  preflop: "翻前策略",
  mtt: "MTT 策略",
  postflop: "翻後策略",
  fundamentals: "基礎概念",
  advanced: "進階概念",
};

const categoryLabelsEn: Record<string, string> = {
  preflop: "Preflop Strategy",
  mtt: "MTT Strategy",
  postflop: "Postflop Strategy",
  fundamentals: "Fundamentals",
  advanced: "Advanced",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return {
      title: "文章未找到 - GTO Poker Trainer",
    };
  }

  return {
    title: `${guide.title}`,
    description: guide.description,
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      url: `${BASE_URL}/learn/${slug}`,
      siteName: "GTO Poker Trainer",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
    alternates: {
      canonical: `${BASE_URL}/learn/${slug}`,
    },
  };
}

function ArticleJsonLd({
  title,
  description,
  slug,
  category,
}: {
  title: string;
  description: string;
  slug: string;
  category: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    author: {
      "@type": "Organization",
      name: "GTO Poker Trainer",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "GTO Poker Trainer",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/${slug}`,
    },
    articleSection: categoryLabelsEn[category] || category,
    inLanguage: "zh-TW",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Article navigation component
function ArticleNavigation({
  prev,
  next,
}: {
  prev: GuideMetadata | null;
  next: GuideMetadata | null;
}) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-12 flex items-stretch justify-between gap-4 border-t pt-8">
      {prev ? (
        <Link
          href={`/learn/${prev.slug}`}
          className="group border-border hover:border-primary hover:bg-primary/5 flex-1 rounded-lg border p-4 transition-colors"
        >
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            <span>上一篇</span>
          </div>
          <div className="group-hover:text-primary line-clamp-2 font-medium transition-colors">
            {prev.title}
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={`/learn/${next.slug}`}
          className="group border-border hover:border-primary hover:bg-primary/5 flex-1 rounded-lg border p-4 text-right transition-colors"
        >
          <div className="text-muted-foreground mb-1 flex items-center justify-end gap-2 text-sm">
            <span>下一篇</span>
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="group-hover:text-primary line-clamp-2 font-medium transition-colors">
            {next.title}
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const { prev, next } = getAdjacentGuidesInCategory(slug);

  if (!guide) {
    notFound();
  }

  return (
    <>
      <ArticleJsonLd
        title={guide.title}
        description={guide.description}
        slug={slug}
        category={guide.category}
      />
      <div className="container max-w-3xl py-8">
        <div className="mb-6">
          <Link href="/learn">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回學習中心
            </Button>
          </Link>
        </div>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <div className="not-prose mb-6">
            <Badge variant="secondary" className="mb-4">
              <BookOpen className="mr-1 h-3 w-3" />
              {categoryLabels[guide.category] || guide.category}
            </Badge>
            <p className="text-muted-foreground">{guide.description}</p>
          </div>

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mt-8 mb-4 text-3xl font-bold">{children}</h1>,
              h2: ({ children }) => (
                <h2 className="mt-8 mb-4 border-b pb-2 text-2xl font-semibold">{children}</h2>
              ),
              h3: ({ children }) => <h3 className="mt-6 mb-3 text-xl font-semibold">{children}</h3>,
              h4: ({ children }) => <h4 className="mt-4 mb-2 text-lg font-medium">{children}</h4>,
              p: ({ children }) => <p className="my-4 leading-7">{children}</p>,
              ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2">{children}</ul>,
              ol: ({ children }) => (
                <ol className="my-4 ml-6 list-decimal space-y-2">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-7">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-primary text-muted-foreground my-4 border-l-4 pl-4 italic">
                  {children}
                </blockquote>
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-muted my-4 overflow-x-auto rounded-lg p-4 text-sm">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="my-6 overflow-x-auto">
                  <table className="w-full border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
              th: ({ children }) => (
                <th className="border px-4 py-2 text-left font-semibold">{children}</th>
              ),
              td: ({ children }) => <td className="border px-4 py-2">{children}</td>,
              hr: () => <hr className="my-8 border-t" />,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary hover:underline"
                  target={href?.startsWith("http") ? "_blank" : undefined}
                  rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {guide.content}
          </ReactMarkdown>
        </article>

        {/* 上一篇 / 下一篇 導航 */}
        <ArticleNavigation prev={prev} next={next} />

        <div className="mt-8 border-t pt-8">
          <h3 className="mb-4 text-lg font-semibold">開始練習</h3>
          <div className="flex flex-wrap gap-3">
            {guide.category === "preflop" && (
              <>
                <Link href="/drill/rfi">
                  <Button variant="outline">RFI 練習</Button>
                </Link>
                <Link href="/drill/vs-3bet">
                  <Button variant="outline">VS 3-Bet 練習</Button>
                </Link>
              </>
            )}
            {guide.category === "mtt" && (
              <>
                <Link href="/mtt/push-fold">
                  <Button variant="outline">Push/Fold 圖表</Button>
                </Link>
                <Link href="/mtt/icm">
                  <Button variant="outline">ICM 計算器</Button>
                </Link>
              </>
            )}
            {guide.category === "postflop" && (
              <Link href="/drill/postflop">
                <Button variant="outline">C-Bet 練習</Button>
              </Link>
            )}
            {guide.category === "advanced" && (
              <>
                <Link href="/quiz/logic">
                  <Button variant="outline">邏輯測驗</Button>
                </Link>
                <Link href="/quiz/equity">
                  <Button variant="outline">Equity 測驗</Button>
                </Link>
              </>
            )}
            <Link href="/range">
              <Button variant="outline">範圍查看器</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
