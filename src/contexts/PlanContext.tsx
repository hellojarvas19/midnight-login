import { createContext, useContext, useState, ReactNode } from "react";

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
}

const PlanContext = createContext<PlanContextValue>({
  activePlan: PLAN_DETAILS.pro,
  setPlanId: () => {},
});

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const [planId, setPlanId] = useState<PlanId>("pro");
  return (
    <PlanContext.Provider value={{ activePlan: PLAN_DETAILS[planId], setPlanId }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);
