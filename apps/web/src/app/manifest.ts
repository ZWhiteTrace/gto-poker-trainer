import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GTO 扑克训练器 - 免费德州扑克练习工具",
    short_name: "GTO训练器",
    description: "专为德扑玩家打造的免费 GTO 训练工具。翻前范围练习、EV 计算、Push/Fold 图表，全中文界面，无需注册。",
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
        name: "RFI 开池练习",
        short_name: "RFI",
        url: "/drill/rfi",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "范围表查看器",
        short_name: "范围表",
        url: "/range",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Push/Fold 图表",
        short_name: "推图",
        url: "/mtt/push-fold",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
