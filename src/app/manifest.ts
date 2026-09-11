import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quill — Trading & Life Journal",
    short_name: "Quill",
    description: "A private trading and life journal with behavioural intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0d10",
    theme_color: "#b45309",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
