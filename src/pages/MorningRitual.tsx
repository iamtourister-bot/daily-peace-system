import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const BG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80";

type Step = "breathe" | "direction" | "anchor" | "done";

export default function MorningRitual() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("breathe");
  const [breathDone, setBreathDone] = useState(false);
  const [intention, setIntention] = useState("");
  const [grateful, setGrateful] = useState("");

  const handleBreathDone = () => {
    setBreathDone(true);
    setTimeout(() => setStep("direction"), 800);
  };

  const handleDirection = () => {
    if (!intention.trim()) return;
    setStep("anchor");
  };

  const handleAnchor = () => {
    if (!grateful.trim()) return;

    // Save to gratitude journal
    const today = new Date().toISOString().split("T")[0];
    const key = "reset_gratitude";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = existing.filter((e: any) => e.date !== today);
    filtered.unshift({ date: today, text: grateful, fromMorning: true });
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 60)));

    setStep("done");
  };

  const handleClose = () => setLocation("/");

  return (
    <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG})` }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <button
        onClick={handleClose}
        className="absolute top-6 right-6 z-20 p-2 text-white/60 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <AnimatePresence mode="wait">

          {/* Step 1 — Breathe */}
          {step === "breathe" && (
            <motion.div
              key="breathe"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center w-full"
            >
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">
                3 Minute Morning
              </p>
              <h2 className="text-3xl font-serif text-white mb-3 leading-tight">
                Before the day begins...
              </h2>
              <p className="text-white/70 text-base mb-12">
                Take one breath with me.
              </p>

              {!breathDone ? (
                <motion.button
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  onClick={handleBreathDone}
                  className="w-32 h-32 rounded-full bg-white/10 border border-white/30 flex items-center justify-center mx-auto mb-10"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20" />
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-32 h-32 rounded-full bg-white/20 border border-white/40 flex items-center justify-center mx-auto mb-10"
                >
                  <div className="w-16 h-16 rounded-full bg-white/30" />
                </motion.div>
              )}

              <p className="text-white/50 text-sm">
                {breathDone ? "Good. Moving forward..." : "Tap the circle when you're ready."}
              </p>
            </motion.div>
          )}

          {/* Step 2 — Direction */}
          {step === "direction" && (
            <motion.div
              key="direction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center w-full max-w-sm"
            >
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">
                Step 2 of 3
              </p>
              <h2 className="text-3xl font-serif text-white mb-3 leading-tight">
                What matters most today?
              </h2>
              <p className="text-white/60 text-sm mb-8">
                Not a to-do list. Just one thing.
              </p>
              <textarea
                value={intention}
                onChange={e => setIntention(e.target.value)}
                placeholder="Today what matters most is..."
                className="w-full h-28 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white text-sm leading-relaxed resize-none outline-none placeholder:text-white/30 backdrop-blur-sm mb-6"
                autoFocus
              />
              <button
                onClick={handleDirection}
                disabled={!intention.trim()}
                className="w-full py-4 bg-white/15 border border-white/30 text-white rounded-2xl font-medium hover:bg-white/20 transition-colors disabled:opacity-40"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step 3 — Anchor */}
          {step === "anchor" && (
            <motion.div
              key="anchor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center w-full max-w-sm"
            >
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">
                Step 3 of 3
              </p>
              <h2 className="text-3xl font-serif text-white mb-3 leading-tight">
                Name one thing you're grateful for.
              </h2>
              <p className="text-white/60 text-sm mb-8">
                Even something small counts.
              </p>
              <textarea
                value={grateful}
                onChange={e => setGrateful(e.target.value)}
                placeholder="I'm grateful for..."
                className="w-full h-28 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white text-sm leading-relaxed resize-none outline-none placeholder:text-white/30 backdrop-blur-sm mb-6"
                autoFocus
              />
              <button
                onClick={handleAnchor}
                disabled={!grateful.trim()}
                className="w-full py-4 bg-white/15 border border-white/30 text-white rounded-2xl font-medium hover:bg-white/20 transition-colors disabled:opacity-40"
              >
                Finish
              </button>
            </motion.div>
          )}

          {/* Done */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center w-full max-w-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-white/15 border border-white/30 flex items-center justify-center mx-auto mb-8"
              >
                <span className="text-2xl">🌅</span>
              </motion.div>
              <h2 className="text-3xl font-serif text-white mb-4 leading-tight">
                That's enough.
              </h2>
              <p className="text-white/70 text-lg mb-2">
                You've started your day with intention.
              </p>
              <p className="text-white/40 text-sm mb-12">
                You showed up this morning. 💚
              </p>
              <button
                onClick={handleClose}
                className="w-full py-4 bg-white/15 border border-white/30 text-white rounded-2xl font-medium hover:bg-white/20 transition-colors"
              >
                Begin my day
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="relative z-10 flex justify-center gap-2 pb-12">
        {["breathe", "direction", "anchor", "done"].map((s, i) => (
          <div
            key={s}
            className={`rounded-full transition-all duration-300 ${
              s === step ? "w-5 h-2 bg-white/70" : "w-2 h-2 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
