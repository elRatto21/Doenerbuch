import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dönerbuch",
    short_name: "Dönerbuch",
    description: "Dein Döner-Journal: eintragen, bewerten, vergleichen.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F3EE",
    theme_color: "#F5F3EE",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Neuer Döner", url: "/neu", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
