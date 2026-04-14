import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { X } from "lucide-react";

const NIGHT_BG = "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format&fit=crop&q=80";

type StepType = "text" | "breathe" | "ending";

interface Step {
  type: StepType;
  text?: string;
  sub?: string;
  duration: number;
}

const STEPS: Step[] = [
  { type: "text", text: "The day is over.", sub: "Whatever happened… it's behind you now.", duration: 8000 },
  { type: "breathe", duration: 26000 },
  { type: "text", text: "Let your shoulders drop.", sub: "Let them feel heavy… and drop.", duration: 8000 },
  { type: "text", text: "Soften your jaw.", sub: "Around your eyes too… let it all soften.", duration: 8000 },
  { type: "text", text: "You did enough today.", sub: "You don't need to prove anything tonight.", duration: 8000 },
  { type: "text", text: "Release your hands.", sub: "Unclench them… let them rest.", duration: 8000 },
  { type: "text", text: "No solving tonight.", sub: "What isn't done… can wait for tomorrow.", duration: 8000 },
  { type: "text", text: "You've done enough.", sub: "Let the rest happen… naturally.", duration: 9000 },
  { type: "ending", duration: 0 },
];

export default function Night() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"in" | "out">("out");
  const [showOptions, setShowOptions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = STEPS[step];

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    return () => {
      const saved = localStorage.getItem("reset-theme") || "light";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(saved);
    };
  }, []);

  // Auto advance
  useEffect(() => {
    if (current.type === "ending") {
      // Fade in options after 2 seconds
      const t = setTimeout(() => setShowOptions(true), 2000);
      return () => clearTimeout(t);
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      advanceStep();
    }, current.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step]);

  // Breathing animation
  useEffect(() => {
    if (current.type === "breathe") {
      breathRef.current = setInterval(() => {
        setBreathPhase(p => p === "in" ? "out" : "in");
      }, 4000);
    }
    return () => {
      if (breathRef.current) clearInterval(breathRef.current);
    };
  }, [step]);

  const advanceStep = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    }
  };

  const handleTap = () => {
    if (current.type === "ending") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    advanceStep();
  };

  const textStepCount = STEPS.filter(s => s.type !== "ending").length;
  const currentDotIndex = Math.min(step, textStepCount - 1);

  return (
    <PageTransition>
      <div
        className="flex flex-col min-h-[100dvh] relative overflow-hidden"
        onClick={handleTap}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${NIGHT_BG})` }}
        />
        <div className="absolute inset-0 bg-black/75" />
<canvas
  id="stars-canvas"
  className="absolute inset-0 w-full h-full"
  style={{ zIndex: 1 }}
/>

        <button
          onClick={(e) => { e.stopPropagation(); setLocation("/"); }}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center justify-center flex-1 px-8 relative z-10">
          <AnimatePresence mode="wait">

            {/* Text steps */}
            {current.type === "text" && (
              <motion.div
                key={`text-${step}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="text-center"
              >
                <p className="text-3xl font-serif text-white leading-tight mb-4">
                  {current.text}
                </p>
                <p className="text-white/45 text-base leading-relaxed">
                  {current.sub}
                </p>
                <p className="text-white/15 text-xs mt-12">tap to continue</p>
              </motion.div>
            )}

            {/* Breathing step */}
            {current.type === "breathe" && (
              <motion.div
                key="breathe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="text-center"
              >
                <p className="text-white/50 text-base mb-10">Breathe with me.</p>
                <motion.div
                  animate={{ scale: breathPhase === "in" ? 1.4 : 0.85 }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-10"
                >
                  <div className="w-14 h-14 rounded-full bg-white/15" />
                </motion.div>
                <p className="text-white/40 text-sm">
                  {breathPhase === "in" ? "Breathe in..." : "Breathe out..."}
                </p>
              </motion.div>
            )}

            {/* Ending */}
            {current.type === "ending" && (
              <motion.div
                key="ending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
                className="text-center w-full max-w-sm"
              >
                <p className="text-2xl font-serif text-white mb-3 leading-relaxed">
                  Take this calm with you
                </p>
                <p className="text-white/50 text-base mb-16">
                  into the night.
                </p>

                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.2 }}
                      className="flex flex-col gap-3"
                    >
                      <button
                        onClick={() => setLocation("/sleep-stories")}
                        className="w-full py-4 bg-white/8 border border-white/15 rounded-2xl text-white font-medium hover:bg-white/12 transition-colors flex items-center justify-center gap-3"
                      >
                        <span>🌙</span>
                        <span>Continue with a sleep story</span>
                      </button>
                      <button
                        onClick={() => setLocation("/calming-room")}
                        className="w-full py-4 bg-white/8 border border-white/15 rounded-2xl text-white font-medium hover:bg-white/12 transition-colors flex items-center justify-center gap-3"
                      >
                        <span>🌿</span>
                        <span>Stay in a calm space</span>
                      </button>
                      <button
                        onClick={() => setLocation("/")}
                        className="w-full py-3 text-white/25 text-sm hover:text-white/40 transition-colors"
                      >
                        Goodnight
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Soft dots — no pressure */}
        {current.type !== "ending" && (
          <div className="relative z-10 flex justify-center gap-1.5 pb-14">
            {STEPS.filter(s => s.type !== "ending").map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: i === currentDotIndex ? 0.6 : 0.15,
                  width: i === currentDotIndex ? 16 : 6,
                }}
                transition={{ duration: 0.4 }}
                className="h-1.5 rounded-full bg-white"
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
