import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type PlanId = "free" | "pro" | "enterprise";

export interface PlanDetails {
  id: PlanId;
  name: string;
  checkLimit: string;
  dailyCredits: string;
  access: string;
}

const PLAN_DETAILS: Record<PlanId, PlanDetails> = {
  free: { id: "free", name: "Free", checkLimit: "50 CCs", dailyCredits: "500", access: "1 Day" },
  pro: { id: "pro", name: "Pro", checkLimit: "500 CCs", dailyCredits: "5,000", access: "7 Days" },
  enterprise: { id: "enterprise", name: "Enterprise", checkLimit: "Unlimited", dailyCredits: "50,000", access: "30 Days" },
};

interface PlanContextValue {
  activePlan: PlanDetails;
  setPlanId: (id: PlanId) => void;
  loading: boolean;
}

const PlanContext = createContext<PlanContextValue>({
  activePlan: PLAN_DETAILS.free,
  setPlanId: () => {},
  loading: true,
});

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [planId, setPlanIdState] = useState<PlanId>("free");
  const [loading, setLoading] = useState(true);

  // Sync from profile
  useEffect(() => {
    if (profile?.plan && (profile.plan === "free" || profile.plan === "pro" || profile.plan === "enterprise")) {
      setPlanIdState(profile.plan as PlanId);
    }
    setLoading(false);
  }, [profile]);

  const setPlanId = useCallback(async (id: PlanId) => {
    if (!user) return;
    setPlanIdState(id);
    await supabase.from("profiles").update({ plan: id } as any).eq("id", user.id);
    await refreshProfile();
  }, [user, refreshProfile]);

  return (
    <PlanContext.Provider value={{ activePlan: PLAN_DETAILS[planId], setPlanId, loading }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);
