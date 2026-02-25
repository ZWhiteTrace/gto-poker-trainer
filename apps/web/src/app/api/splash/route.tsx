import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const w = Number(searchParams.get("w")) || 1170;
  const h = Number(searchParams.get("h")) || 2532;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "28px",
          background: "#16a34a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "64px",
          marginBottom: "24px",
        }}
      >
        ♠
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.5px",
        }}
      >
        GTO 撲克訓練器
      </div>
    </div>,
    { width: w, height: h }
  );
}
