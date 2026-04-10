import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { X } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

const PHASE_IMAGES = [
  "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
];

const PHASES = [
  { id: 1, name: "Body Scan", duration: 20000 },
  { id: 2, name: "Breath Work", duration: 20000 },
  { id: 3, name: "Visualization", duration: 20000 },
  { id: 4, name: "Affirmation", duration: 15000 }
];

export default function FullReset() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");
  const [breathCount, setBreathCount] = useState(4);
  const [, setLocation] = useLocation();
  const { emotionalState } = useSession();

  const currentPhase = PHASES[phaseIndex];

  useEffect(() => {
    if (phaseIndex >= PHASES.length) {
      setLocation("/insight");
      return;
    }

    const timer = setTimeout(() => {
      setPhaseIndex(prev => prev + 1);
    }, currentPhase.duration);

    return () => clearTimeout(timer);
  }, [phaseIndex, setLocation, currentPhase]);

  useEffect(() => {
    if (currentPhase?.id !== 2) return;
    let active = true;

    const runCycle = () => {
      if (!active) return;
      setBreathPhase("in");
      setBreathCount(4);
      const countDown = (from: number, onDone: () => void) => {
        let n = from;
        const iv = setInterval(() => {
          n--;
          setBreathCount(n);
          if (n <= 0) { clearInterval(iv); onDone(); }
        }, 1000);
        return iv;
      };
      countDown(4, () => {
        if (!active) return;
        setBreathPhase("hold");
        setBreathCount(7);
        countDown(7, () => {
          if (!active) return;
          setBreathPhase("out");
          setBreathCount(8);
          countDown(8, () => {
            if (active) setTimeout(runCycle, 500);
          });
        });
      });
    };

    runCycle();
    return () => { active = false; };
  }, [currentPhase?.id]);

  const currentImage = PHASE_IMAGES[Math.min(phaseIndex, PHASE_IMAGES.length - 1)];

  const getAffirmation = () => {
    if (emotionalState === "Anxious") return "You are safe, right here, right now. Your breath is proof of life. You are here.";
    if (emotionalState === "Overwhelmed") return "One thing at a time. One breath at a time. You don't have to carry it all.";
    if (emotionalState === "Heavy" || emotionalState === "Tired") return "Rest is not failure. Rest is how strength comes back. You are allowed to be tired.";
    if (emotionalState === "Scattered") return "You found stillness inside the chaos. It was always here waiting for you.";
    return "You are doing better than you think you are. The fact that you're here proves that.";
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentImage})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/55" />

        <div className="flex flex-col min-h-[100dvh] px-6 py-12 relative z-10">
          <button
            onClick={() => setLocation("/")}
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white z-10"
            data-testid="btn-close-full-reset"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full flex gap-2 mb-16 pt-8">
            {PHASES.map((p, i) => (
              <div
                key={p.id}
                className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                  i <= phaseIndex ? "bg-white/70" : "bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {currentPhase?.id === 1 && (
                <motion.div
                  key="scan"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center max-w-sm"
                >
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">Body Scan</p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="text-2xl font-serif text-white leading-relaxed"
                  >
                    Starting from your feet... let them rest heavy. Let the tension drain from your legs... your shoulders... your jaw.
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, delay: 5 }}
                    className="text-white/70 mt-6 text-lg"
                  >
                    Notice without judgment. Just observe.
                  </motion.p>
                </motion.div>
              )}

              {currentPhase?.id === 2 && (
                <motion.div
                  key="breath"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center"
                >
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-8">4-7-8 Breathing</p>
                  <motion.div
                    animate={{
                      scale: breathPhase === "in" ? 1.6 : breathPhase === "hold" ? 1.6 : 0.7,
                    }}
                    transition={{
                      duration: breathPhase === "in" ? 4 : breathPhase === "hold" ? 0.5 : 8,
                      ease: "easeInOut"
                    }}
                    className="w-32 h-32 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-12"
                  >
                    <span className="text-3xl font-mono font-bold text-white">{breathCount}</span>
                  </motion.div>
                  <p className="text-2xl font-serif text-white mb-2">
                    {breathPhase === "in" && "Inhale"}
                    {breathPhase === "hold" && "Hold"}
                    {breathPhase === "out" && "Exhale slowly"}
                  </p>
                  <p className="text-white/50 text-sm">
                    {breathPhase === "in" && "Through your nose"}
                    {breathPhase === "hold" && "Keep it still"}
                    {breathPhase === "out" && "Through your mouth"}
                  </p>
                </motion.div>
              )}

              {currentPhase?.id === 3 && (
                <motion.div
                  key="viz"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center max-w-sm"
                >
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">Visualization</p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="text-2xl font-serif text-white leading-relaxed"
                  >
                    You're already in this place. Let the image behind this window be real for a moment.
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, delay: 5 }}
                    className="text-white/70 mt-6 text-lg"
                  >
                    No responsibilities here. Just be.
                  </motion.p>
                </motion.div>
              )}

              {currentPhase?.id === 4 && (
                <motion.div
                  key="affirm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center max-w-sm"
                >
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-8">Your Affirmation</p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="text-2xl font-serif text-white leading-relaxed"
                  >
                    {getAffirmation()}
                  </motion.p>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 5 }}
                    onClick={() => setLocation("/insight")}
                    className="mt-12 px-8 py-3 bg-white/20 text-white rounded-full border border-white/30 font-medium hover:bg-white/30 transition-colors"
                    data-testid="btn-complete-full-reset"
                  >
                    I'm ready
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
