import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AlertCircle, Check, Phone } from "lucide-react";

export default function Crisis() {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Look", text: "Look around you. Name 5 things you can see right now.", count: 5 },
    { title: "Touch", text: "Find 4 things you can physically feel. Touch them. Notice their texture.", count: 4 },
    { title: "Hear", text: "Listen carefully. Name 3 distinct sounds you can hear right now.", count: 3 },
    { title: "Smell", text: "Notice 2 things you can smell. Or think of 2 smells you like.", count: 2 },
    { title: "Taste", text: "Notice 1 thing you can taste. Or take a sip of water.", count: 1 }
  ];

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 relative bg-background">
        <div className="mb-12">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-6">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-serif tracking-tight mb-3">You are not alone.</h1>
          <p className="text-muted-foreground text-lg">
            Let's get through this moment together. Slow down. Follow the steps below.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <AnimatePresence>
            {steps.map((s, index) => (
              index <= step && (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  className="bg-card border border-border p-6 rounded-2xl"
                >
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">{s.count}</span>
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">{s.text}</p>
                  
                  {index === step ? (
                    <button
                      onClick={() => setStep(s => s + 1)}
                      className="w-full py-3 bg-secondary rounded-xl text-foreground font-medium hover:bg-secondary/80 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      I did this
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-primary text-sm font-medium">
                      <Check className="w-4 h-4" /> Completed
                    </div>
                  )}
                </motion.div>
              )
            ))}
          </AnimatePresence>

          {step >= steps.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-secondary/50 p-6 rounded-2xl border border-border text-center"
            >
              <h3 className="font-serif text-xl mb-4">You did well.</h3>
              <p className="text-muted-foreground mb-6">If you still feel unsafe, please reach out to someone you trust or a professional resource.</p>
              
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-center gap-3 w-full py-3 bg-card border border-border rounded-xl font-medium">
                  <Phone className="w-4 h-4" /> Emergency Services
                </button>
                <button className="flex items-center justify-center gap-3 w-full py-3 bg-card border border-border rounded-xl font-medium">
                  <Phone className="w-4 h-4" /> Crisis Hotline
                </button>
                <Link href="/">
                  <button className="mt-4 text-muted-foreground underline underline-offset-4">Return to Home</button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
