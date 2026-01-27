import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GTO Poker Trainer",
    short_name: "GTO Trainer",
    description: "Master GTO poker strategy with interactive training tools",
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
        name: "RFI Drill",
        short_name: "RFI",
        url: "/drill/rfi",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Range Viewer",
        short_name: "Ranges",
        url: "/range",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Push/Fold Charts",
        short_name: "Push/Fold",
        url: "/mtt/push-fold",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
