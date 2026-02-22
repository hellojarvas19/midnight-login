import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type PlanId = "basic" | "standard" | "pro";

export interface PlanDetails {
  id: PlanId;
  name: string;
  price: string;
  priceUsd: number;
  duration: number; // days
  features: string[];
}

export const PLAN_DETAILS: Record<PlanId, PlanDetails> = {
  basic: {
    id: "basic",
    name: "Basic",
    price: "$10",
    priceUsd: 10,
    duration: 7,
    features: ["500 checks/day", "All gateways", "Priority support", "Mass checker", "Multi-proxy rotation", "API access", "Community chat"],
  },
  standard: {
    id: "standard",
    name: "Standard",
    price: "$20",
    priceUsd: 20,
    duration: 15,
    features: ["500 checks/day", "All gateways", "Priority support", "Mass checker", "Multi-proxy rotation", "API access", "Community chat"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$40",
    priceUsd: 40,
    duration: 30,
    features: ["500 checks/day", "All gateways", "Priority support", "Mass checker", "Multi-proxy rotation", "API access", "Community chat"],
  },
};

export const CRYPTO_WALLETS = [
  { currency: "BTC", label: "Bitcoin", address: "13rJZSUpuj8pbx8Qv75aC9xHzuxQgCXEVA" },
  { currency: "USDT_TRC20", label: "USDT (TRC20)", address: "TVzHukR7wqDTgqZuQbVEjfX4vMGjsuKuSF" },
  { currency: "USDT_BSC20", label: "USDT (BSC20)", address: "0xbe68374fa806770625e6df676f0fb2cbd7afc388" },
  { currency: "LTC", label: "Litecoin", address: "LPZ6YbME6DikmV9yT163PAwFQTEAf6GK5U" },
];

interface PlanContextValue {
  activePlan: PlanDetails | null;
  planExpiresAt: string | null;
  isPlanActive: boolean;
  setPlanId: (id: PlanId) => void;
  loading: boolean;
}

const PlanContext = createContext<PlanContextValue>({
  activePlan: null,
  planExpiresAt: null,
  isPlanActive: false,
  setPlanId: () => {},
  loading: true,
});

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [planId, setPlanIdState] = useState<PlanId | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      const p = profile.plan as PlanId;
      if (p && (p === "basic" || p === "standard" || p === "pro")) {
        setPlanIdState(p);
      } else {
        setPlanIdState(null);
      }
      setPlanExpiresAt((profile as any).plan_expires_at || null);
    }
    setLoading(false);
  }, [profile]);

  const isPlanActive = !!planExpiresAt && new Date(planExpiresAt) > new Date();

  const setPlanId = useCallback(async (id: PlanId) => {
    if (!user) return;
    setPlanIdState(id);
    await supabase.from("profiles").update({ plan: id } as any).eq("id", user.id);
    await refreshProfile();
  }, [user, refreshProfile]);

  const activePlan = planId ? PLAN_DETAILS[planId] : null;

  return (
    <PlanContext.Provider value={{ activePlan, planExpiresAt, isPlanActive, setPlanId, loading }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);
