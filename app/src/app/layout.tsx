import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Venture Studio OS",
  description: "Single-owner venture studio operating system (Phase 01 Foundation)",
};

function EnvBanner() {
  // SCREEN_SPECIFICATIONS: non-production builds show env name, branch, version, port.
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return null;
  const env = process.env.VSO_ENV ?? process.env.NODE_ENV ?? "development";
  const branch = process.env.VSO_GIT_BRANCH ?? "develop";
  const version = process.env.npm_package_version ?? "0.1.0";
  const port = process.env.PORT ?? "3000";
  return (
    <div
      data-testid="env-banner"
      style={{
        background: "var(--vso-surface-2)",
        color: "var(--vso-text-muted)",
        borderBottom: "1px solid var(--vso-border)",
        fontSize: 12,
        padding: "var(--vso-space-2) var(--vso-space-4)",
        fontFamily: "monospace",
      }}
    >
      {env} · {branch} · v{version} · :{port}
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EnvBanner />
        {children}
      </body>
    </html>
  );
}
