import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Check, X, Heart } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

const BREATHING_BG = "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=800&auto=format&fit=crop&q=80";
const GROUNDING_BG = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80";

const GROUNDING_PROMPTS = [
  "Something close to you",
  "Something with color",
  "Something that moves",
  "Something still and quiet",
  "Something you usually ignore",
];

export default function QuickReset() {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [breathState, setBreathState] = useState<"in" | "out">("in");
  const [, setLocation] = useLocation();
  const { emotionalState } = useSession();
  const [items, setItems] = useState([false, false, false, false, false]);

  useEffect(() => {
    if (phase === 1) {
      const interval = setInterval(() => {
        setBreathState(prev => prev === "in" ? "out" : "in");
      }, 4000);
      const phaseTimer = setTimeout(() => {
        setPhase(2);
      }, 16000);
      return () => {
        clearInterval(interval);
        clearTimeout(phaseTimer);
      };
    } else if (phase === 3) {
      const timer = setTimeout(() => {
        setLocation("/insight");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [phase, setLocation]);

  useEffect(() => {
    if (phase === 2 && items.every(Boolean)) {
      setTimeout(() => setPhase(3), 800);
    }
  }, [items, phase]);

  const toggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index] = !newItems[index];
    setItems(newItems);
  };

  const getReassurance = () => {
    if (emotionalState === "Anxious") return "Your nervous system is just trying to protect you. It's okay to stand down.";
    if (emotionalState === "Overwhelmed") return "You don't have to handle everything right now. One breath. One moment.";
    if (emotionalState === "Heavy" || emotionalState === "Tired") return "You don't have to carry it all right now. Just rest here for a moment.";
    if (emotionalState === "Scattered") return "You found stillness. That's not small. That's everything.";
    return "You did exactly what you needed to do. That took real courage.";
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">

        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${phase === 2 ? GROUNDING_BG : BREATHING_BG})`,
          }}
        />
        <div className="absolute inset-0 bg-black/50" />

        <div className="flex flex-col min-h-[100dvh] px-6 py-12 relative z-10">
          <button
            onClick={() => setLocation("/")}
            className="absolute top-6 right-6 p-2 z-10 text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Progress bar */}
          <div className="w-full flex gap-2 mb-16 pt-8">
            {[1, 2, 3].map((p) => (
              <div
                key={p}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  p <= phase ? "bg-white/70" : "bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">

              {/* Phase 1 — Breathing */}
              {phase === 1 && (
                <motion.div
                  key="phase1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <h2 className="text-2xl font-serif mb-4 text-center text-white">Breathe with the circle</h2>
                  <p className="text-white/60 text-sm mb-12 text-center">Let nature hold you for a moment</p>
                  <motion.div
                    animate={{ scale: breathState === "in" ? 1.5 : 0.8 }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="w-32 h-32 rounded-full bg-white/20 border border-white/30 flex items-center justify-center mb-16"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/30" />
                  </motion.div>
                  <p className="text-xl text-white/80 transition-opacity duration-500">
                    {breathState === "in" ? "Breathe in..." : "Breathe out..."}
                  </p>
                </motion.div>
              )}

              {/* Phase 2 — Grounding */}
              {phase === 2 && (
                <motion.div
                  key="phase2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full max-w-sm"
                >
                  <h2 className="text-2xl font-serif mb-2 text-white">Grounding</h2>
                  <p className="text-white/70 mb-8 text-base">
                    Look around. Tap each thing as you find it.
                  </p>

                  <div className="flex flex-col gap-3">
                    {items.map((checked, i) => (
                      <button
                        key={i}
                        onClick={() => toggleItem(i)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all backdrop-blur-sm ${
                          checked
                            ? "bg-white/20 border-white/40 text-white"
                            : "bg-black/30 border-white/20 text-white/70 hover:bg-black/40"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                          checked ? "bg-white border-white" : "border-white/40"
                        }`}>
                          {checked && <Check className="w-4 h-4 text-black" />}
                        </div>
                        <span className="font-medium text-left flex-1">
                          {checked ? `Found it` : `I can see — ${GROUNDING_PROMPTS[i]}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Phase 3 — Reassurance */}
              {phase === 3 && (
                <motion.div
                  key="phase3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center px-4"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto mb-8">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-serif mb-6 leading-tight text-white">
                    You are safe.<br />This moment will pass.
                  </h2>
                  <p className="text-white/80 text-lg leading-relaxed">
                    {getReassurance()}
                  </p>
                  <button
                    onClick={() => setLocation("/insight")}
                    className="mt-12 px-8 py-3 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-full font-medium hover:bg-white/30 transition-colors"
                  >
                    Continue
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
