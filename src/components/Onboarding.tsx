import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
  {
    bg: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
    label: "Welcome",
    title: "Welcome to Reset.",
    body: "These days, anxiety and stress feel almost constant. I know that because I have lived it.\n\nThat is why I built this app — it started as something just for me. But then I realized… why keep it to myself?\n\nBecause sometimes, one small moment is enough to change everything.",
  },
  {
    bg: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80",
    label: "What Reset does",
    title: "Your peace. Your pace.",
    body: "A safe space to release what you are carrying.\n\nSimple tools to calm your mind in minutes.\n\nDaily practices to build peace from the inside out.",
  },
  {
    bg: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
    label: "Begin",
    title: "You showed up.\nThat is the first step.",
    body: "Reset is here whenever you need it. No pressure. No perfection. Just one moment at a time.",
  },
];

const STORAGE_KEY = "reset_onboarding_done";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      onDone();
    }
  };

  const slide = SLIDES[current];

  return (
    <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${slide.bg})` }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />

      <div className="absolute top-12 left-0 right-0 flex justify-center gap-2 z-10">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-end p-8 pb-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
              {slide.label}
            </p>
            <h1 className="text-4xl font-serif text-white mb-6 leading-tight whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="text-white/75 text-base leading-relaxed mb-10 whitespace-pre-line">
              {slide.body}
            </p>

            <button
              onClick={handleNext}
              className="w-full bg-white/15 text-white py-4 rounded-2xl font-medium text-lg border border-white/30 backdrop-blur-sm hover:bg-white/25 transition-colors"
            >
              {current < SLIDES.length - 1 ? "Continue" : "Begin my Reset"}
            </button>

            {current < SLIDES.length - 1 && (
              <button
                onClick={() => {
                  localStorage.setItem(STORAGE_KEY, "true");
                  onDone();
                }}
                className="w-full mt-3 text-white/50 py-3 text-sm hover:text-white/70 transition-colors"
              >
                Skip intro
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
