import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Mic, Check } from "lucide-react";

export default function Speak() {
  const [phase, setPhase] = useState<"start" | "listening" | "response">("start");

  useEffect(() => {
    if (phase === "listening") {
      const timer = setTimeout(() => {
        setPhase("response");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 relative bg-background">
        <h1 className="text-3xl font-serif tracking-tight mb-2">Speak & Release</h1>
        <p className="text-muted-foreground mb-12">No recordings are saved. Just a safe place to vent.</p>

        <div className="flex-1 flex flex-col items-center justify-center">
          {phase === "start" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <button
                onClick={() => setPhase("listening")}
                className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors mb-8"
              >
                <Mic className="w-10 h-10" />
              </button>
              <p className="text-xl text-foreground font-medium">Tap to speak</p>
              <p className="text-muted-foreground mt-2">Say whatever is on your mind. We're listening.</p>
            </motion.div>
          )}

          {phase === "listening" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-8 border border-primary/30"
              >
                <Mic className="w-10 h-10" />
              </motion.div>
              <p className="text-xl text-foreground font-medium">Listening...</p>
              <p className="text-muted-foreground mt-2">Take your time. Speak until you're empty.</p>
            </motion.div>
          )}

          {phase === "response" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-6">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif text-center mb-6 text-foreground">We heard you.</h2>
              
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm mb-8 w-full text-center">
                <p className="text-lg italic text-muted-foreground">
                  "It sounds like you're carrying something heavy today. That's entirely okay. You don't have to fix it right now."
                </p>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="bg-secondary/50 p-4 rounded-xl text-sm text-foreground">Is there one small thing you can let go of today?</div>
                <div className="bg-secondary/50 p-4 rounded-xl text-sm text-foreground">What do you need most right now?</div>
              </div>

              <Link href="/insight" className="w-full mt-10">
                <button className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium">
                  Complete Session
                </button>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
