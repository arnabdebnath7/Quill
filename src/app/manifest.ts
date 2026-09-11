import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Quill — Trading & Life Journal",
    short_name: "Quill",
    description: "One calm place for your trades and your days.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0c0d10",
    theme_color: "#0c0d10",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    shortcuts: [
      { name: "Log trade", short_name: "Trade", url: "/trades?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Write journal", short_name: "Write", url: "/journal?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Today", short_name: "Today", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
