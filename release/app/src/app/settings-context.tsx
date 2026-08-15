"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface SettingsValue {
  ownerDisplayName: string;
  ownerTimeZone: string;
  loaded: boolean;
}

const Ctx = createContext<SettingsValue>({
  ownerDisplayName: "Owner",
  ownerTimeZone: "UTC",
  loaded: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsValue>({
    ownerDisplayName: "Owner",
    ownerTimeZone: "UTC",
    loaded: false,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setSettings({
            ownerDisplayName: d.settings.ownerDisplayName,
            ownerTimeZone: d.settings.ownerTimeZone,
            loaded: true,
          });
        }
      })
      .catch(() => setSettings((s) => ({ ...s, loaded: true })));
  }, []);

  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
