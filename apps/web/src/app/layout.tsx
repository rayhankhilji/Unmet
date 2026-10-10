import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { cn } from "@/lib/cn";
import { themeScript } from "@/lib/theme";
import { geist, geistMono, instrumentSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Unmet", template: "%s · Unmet" },
  description:
    "An investigation agent that finds unmet consumer demand in short-form skincare video, and shows the evidence behind every claim.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={cn(instrumentSerif.variable, geist.variable, geistMono.variable)}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, nonce-gated by CSP */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
