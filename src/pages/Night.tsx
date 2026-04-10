import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { X } from "lucide-react";
import { Link } from "wouter";

const NIGHT_BG = "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format&fit=crop&q=80";

const steps = [
  { text: "The day is over.", sub: "Whatever happened, it's done." },
  { text: "You did enough.", sub: "You don't need to prove anything tonight." },
  { text: "Let go of your jaw.", sub: "Unclench. Soften. Breathe." },
  { text: "Let your shoulders drop.", sub: "Heavy like stones. Just rest them." },
  { text: "You're allowed to rest now.", sub: "No solving. No planning. Just this moment." },
  { text: "Goodnight.", sub: "You made it through another day. That matters." },
];

export default function Night() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    return () => {
      const saved = localStorage.getItem("reset-theme") || "light";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(saved);
    };
  }, []);

  const current = steps[step];

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${NIGHT_BG})` }}
        />
        <div className="absolute inset-0 bg-black/72" />

        <button
          onClick={() => setLocation("/")}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center justify-center flex-1 px-8 relative z-10">
          <div className="w-full flex gap-1.5 mb-16">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-colors duration-700 ${
                  i <= step ? "bg-white/50" : "bg-white/15"
                }`}
              />
            ))}
          </div>

          <div className="h-48 flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-3xl font-serif text-white leading-tight mb-3">
                  {current.text}
                </p>
                <p className="text-white/50 text-base">
                  {current.sub}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-16">
            {step < steps.length - 1 ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep(s => s + 1)}
                className="px-10 py-3.5 rounded-full bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-colors"
              >
                Continue
              </motion.button>
            ) : (
              <Link href="/">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="px-10 py-3.5 rounded-full bg-white/20 border border-white/30 text-white font-semibold hover:bg-white/30 transition-colors"
                >
                  Goodnight
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
