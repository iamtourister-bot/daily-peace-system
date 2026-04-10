import React, { createContext, useContext, useState, useEffect } from "react";

export type EmotionalState = "Anxious" | "Overwhelmed" | "Numb" | "Scattered" | "Heavy" | "Okay" | "Tired" | "Restless" | null;
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

interface SessionState {
  emotionalState: EmotionalState;
  intensity: number;
  timeOfDay: TimeOfDay;
}

interface SessionContextType extends SessionState {
  setEmotionalState: (state: EmotionalState) => void;
  setIntensity: (intensity: number) => void;
  clearSession: () => void;
}

const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const clearSession = () => {
    setEmotionalState(null);
    setIntensity(3);
  };

  return (
    <SessionContext.Provider value={{ emotionalState, intensity, timeOfDay, setEmotionalState, setIntensity, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
