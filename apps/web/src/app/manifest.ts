import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GTO 撲克訓練器 - 免費德州撲克練習工具",
    short_name: "GTO訓練器",
    description: "專為德撲玩家打造的免費 GTO 訓練工具。翻前範圍練習、EV 計算、Push/Fold 圖表，全中文介面，無需註冊。",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#16a34a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["education", "games"],
    lang: "zh-TW",
    dir: "ltr",
    screenshots: [],
    shortcuts: [
      {
        name: "RFI 開池練習",
        short_name: "RFI",
        url: "/drill/rfi",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "範圍表查看器",
        short_name: "範圍表",
        url: "/range",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Push/Fold 圖表",
        short_name: "推圖",
        url: "/mtt/push-fold",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
