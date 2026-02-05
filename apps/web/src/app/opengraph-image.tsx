import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "GTO 撲克訓練器 - 免費德州撲克 GTO 練習工具";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
            }}
          >
            ♠
          </div>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            GTO 撲克訓練器
          </div>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#a1a1aa",
            marginBottom: "40px",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          免費德州撲克 GTO 練習工具
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
          }}
        >
          {["翻前範圍", "Push/Fold", "ICM 計算", "AI 分析"].map((text) => (
            <div
              key={text}
              style={{
                padding: "12px 28px",
                borderRadius: "12px",
                border: "1px solid #27272a",
                background: "rgba(255,255,255,0.05)",
                color: "#d4d4d8",
                fontSize: "20px",
              }}
            >
              {text}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "20px",
            color: "#52525b",
          }}
        >
          grindgto.com
        </div>
      </div>
    ),
    { ...size }
  );
}
