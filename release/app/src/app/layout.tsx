import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "./settings-context";
import { Nav } from "./nav";

export const metadata: Metadata = {
  title: "Venture Studio OS",
  description: "Single-owner venture studio operating system (Phase 02 Project Core)",
};

function EnvBanner() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return null;
  const env = process.env.VSO_ENV ?? process.env.NODE_ENV ?? "development";
  const branch = process.env.VSO_GIT_BRANCH ?? "develop";
  const version = process.env.npm_package_version ?? "0.1.0";
  const port = process.env.PORT ?? "3000";
  return (
    <div className="env-banner" data-testid="env-banner">
      {env} · {branch} · v{version} · :{port}
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <EnvBanner />
          <Nav />
          <main className="container">{children}</main>
        </SettingsProvider>
      </body>
    </html>
  );
}
