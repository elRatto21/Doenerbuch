import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { getCurrentUser } from "@/lib/session";
import { pendingIncomingCount } from "@/server/queries/friends";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Dönerbuch", template: "%s · Dönerbuch" },
  description: "Dein Döner-Journal: eintragen, bewerten, vergleichen.",
  applicationName: "Dönerbuch",
  appleWebApp: { capable: true, title: "Dönerbuch", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F3EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const me = await getCurrentUser();
  const friendsBadge = me?.settings.notifications ? await pendingIncomingCount(me.id) : 0;
  return (
    <html lang="de" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh antialiased md:bg-map">
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-ground md:border-x-2 md:border-ink">
          {children}
        </div>
        <BottomNav friendsBadge={friendsBadge} />
      </body>
    </html>
  );
}
