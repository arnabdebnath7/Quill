import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quill — Trading & Life Journal",
    short_name: "Quill",
    description: "One calm place for your trades and your days.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0d10",
    theme_color: "#0c0d10",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
