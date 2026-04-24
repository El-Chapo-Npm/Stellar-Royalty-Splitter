import React, { createContext, useContext, useState, useEffect } from "react";

interface SettingsType {
  autoSaveAuditLog: boolean;
  notifyOnDistribution: boolean;
  displayCurrency: "XLM" | "USD" | "EUR";
  maxPayoutsPerTransaction: number;
  minPayoutAmount: number;
}

interface SettingsContextType {
  settings: SettingsType;
  updateSettings: (patch: Partial<SettingsType>) => void;
}

const DEFAULTS: SettingsType = {
  autoSaveAuditLog: true,
  notifyOnDistribution: true,
  displayCurrency: "XLM",
  maxPayoutsPerTransaction: 10,
  minPayoutAmount: 0.1,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SettingsType>(() => {
    try {
      const raw = localStorage.getItem("royaltySplitterSettings");
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (_) {}
    return DEFAULTS;
  });

  useEffect(() => {
    // Persist settings whenever they change
    try {
      localStorage.setItem("royaltySplitterSettings", JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  const updateSettings = (patch: Partial<SettingsType>) =>
    setSettings((s) => ({ ...s, ...patch }));

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

export default SettingsProvider;
