import { ImageResponse } from "next/og";
import { getGuide } from "@/lib/guides";

export const alt = "GTO 撲克訓練器 - 學習文章";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const categoryLabels: Record<string, string> = {
  preflop: "翻前策略",
  mtt: "MTT 策略",
  postflop: "翻後策略",
  fundamentals: "基礎概念",
  advanced: "進階概念",
};

const categoryColors: Record<string, string> = {
  preflop: "#3b82f6",
  mtt: "#f59e0b",
  postflop: "#10b981",
  fundamentals: "#8b5cf6",
  advanced: "#ef4444",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);

  const title = guide?.title ?? "學習文章";
  const category = guide?.category ?? "fundamentals";
  const categoryLabel = categoryLabels[category] ?? category;
  const accentColor = categoryColors[category] ?? "#16a34a";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              background: accentColor,
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            {categoryLabel}
          </div>
        </div>
        <div
          style={{
            fontSize: title.length > 20 ? "48px" : "56px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            letterSpacing: "-1px",
            marginBottom: "24px",
            display: "flex",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            ♠
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#71717a",
              fontWeight: 600,
            }}
          >
            grindgto.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
