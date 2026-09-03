import type { Metadata } from "next";
import { TrackInputModality } from "@/components/ui/input-modality";
import { DisableThemeTransitions } from "@/components/ui/theme-transitions";
import "./globals.css";

const applyThemeBeforePaint = `(function(){try{var match=document.cookie.match(/(?:^|; )redakt_theme=([^;]*)/);var theme=match?decodeURIComponent(match[1]):"system";if(theme==="light"||theme==="dark")document.documentElement.dataset.theme=theme;else delete document.documentElement.dataset.theme}catch(error){}})()`;

export const metadata: Metadata = {
  title: {
    default: "Remail",
    template: "%s · Remail",
  },
  description: "A design-first open-source mail provider.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyThemeBeforePaint }} />
      </head>
      <body>
        <DisableThemeTransitions />
        <TrackInputModality />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
