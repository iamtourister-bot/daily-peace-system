import { useSession, EmotionalState } from "@/contexts/SessionContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useState } from "react";

const states: EmotionalState[] = [
  "Anxious", "Overwhelmed", "Numb", "Scattered",
  "Heavy", "Okay", "Tired", "Restless"
];

const stateColors: Record<string, string> = {
  Anxious:    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  Overwhelmed:"bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  Numb:       "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
  Scattered:  "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200",
  Heavy:      "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  Okay:       "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
  Tired:      "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200",
  Restless:   "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800 text-pink-800 dark:text-pink-200",
};

const stateSelected: Record<string, string> = {
  Anxious:    "bg-amber-500 border-amber-500 text-white",
  Overwhelmed:"bg-red-500 border-red-500 text-white",
  Numb:       "bg-slate-500 border-slate-500 text-white",
  Scattered:  "bg-violet-500 border-violet-500 text-white",
  Heavy:      "bg-blue-500 border-blue-500 text-white",
  Okay:       "bg-emerald-500 border-emerald-500 text-white",
  Tired:      "bg-orange-500 border-orange-500 text-white",
  Restless:   "bg-pink-500 border-pink-500 text-white",
};

export default function StateEntry() {
  const { setEmotionalState, intensity, setIntensity } = useSession();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<EmotionalState>(null);

  const handleSelect = (state: EmotionalState) => {
    setSelected(state);
    setEmotionalState(state);
    setTimeout(() => setLocation("/path"), 400);
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-serif tracking-tight mb-2 text-foreground">
            How are you right now?
          </h1>
          <p className="text-muted-foreground text-base">
            Don't overthink it. Just choose one.
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-2.5 mb-12">
          {states.map((state, i) => (
            <motion.button
              key={state}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => handleSelect(state)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                selected === state
                  ? stateSelected[state!] + " scale-95 shadow-md"
                  : (stateColors[state!] || "bg-secondary text-foreground border-border hover:bg-secondary/80")
              }`}
              data-testid={`btn-state-${state?.toLowerCase()}`}
            >
              {state}
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-auto bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-semibold text-foreground">
              Intensity
            </label>
            <span className="text-sm text-primary font-bold">{intensity} / 5</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
            data-testid="input-intensity"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2 px-0.5">
            <span>Mild</span>
            <span>Moderate</span>
            <span>Intense</span>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
