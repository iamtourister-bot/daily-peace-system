import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { X, ChevronRight, Wind, Brain, Activity, Zap, Heart } from "lucide-react";

interface Technique {
  id: string;
  name: string;
  tag: string;
  tagline: string;
  science: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  steps: { instruction: string; cue?: string; duration?: number }[];
}

const TECHNIQUES: Technique[] = [
  {
    id: "box",
    name: "Box Breathing",
    tag: "Navy SEALs use this",
    tagline: "Four equal sides. Complete control.",
    science: "Box breathing directly activates your parasympathetic nervous system by regulating CO2 levels in the blood. Used by Navy SEALs, surgeons, and athletes to perform under pressure.",
    icon: Wind,
    color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    steps: [
      { instruction: "Breathe in slowly", cue: "Count to 4", duration: 4 },
      { instruction: "Hold at the top", cue: "Count to 4", duration: 4 },
      { instruction: "Breathe out fully", cue: "Count to 4", duration: 4 },
      { instruction: "Hold at the bottom", cue: "Count to 4", duration: 4 },
    ]
  },
  {
    id: "478",
    name: "4-7-8 Breathing",
    tag: "Clinically proven",
    tagline: "A natural tranquilizer for your nervous system.",
    science: "Dr. Andrew Weil's technique extends the exhale beyond the inhale, forcing your heart rate to slow. The 7-second hold allows oxygen to fully saturate the blood. Regular practice reduces baseline anxiety.",
    icon: Activity,
    color: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300",
    steps: [
      { instruction: "Breathe in through your nose", cue: "Count to 4", duration: 4 },
      { instruction: "Hold your breath completely", cue: "Count to 7", duration: 7 },
      { instruction: "Exhale fully through your mouth", cue: "Count to 8", duration: 8 },
    ]
  },
  {
    id: "sigh",
    name: "Physiological Sigh",
    tag: "Stanford research",
    tagline: "The fastest way to reduce stress. Proven.",
    science: "Stanford neuroscientists found the double-inhale collapses the tiny air sacs in the lungs that collapse under stress, then the long exhale offloads maximum CO2. This technique works in a single breath.",
    icon: Zap,
    color: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    steps: [
      { instruction: "Take a full breath in through your nose", cue: "Fill your lungs", duration: 3 },
      { instruction: "Without exhaling, sniff in a second short breath", cue: "Top up your lungs", duration: 2 },
      { instruction: "Exhale very slowly through your mouth", cue: "As long as possible", duration: 8 },
    ]
  },
  {
    id: "pmr",
    name: "Progressive Relaxation",
    tag: "Deep tension release",
    tagline: "Tension you hold without knowing — released.",
    science: "Progressive Muscle Relaxation (PMR) works by creating contrast: deliberate tension followed by release makes the relaxed state more noticeable and deeper. It also breaks the anxiety-tension feedback loop.",
    icon: Brain,
    color: "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300",
    steps: [
      { instruction: "Squeeze your feet tightly for 5 seconds, then release", cue: "Feel the contrast" },
      { instruction: "Tighten your thighs and glutes for 5 seconds, then release", cue: "Let them sink heavy" },
      { instruction: "Suck in your stomach, tighten your core, hold for 5 seconds, release", cue: "Soften completely" },
      { instruction: "Shrug shoulders to ears, clench fists, hold 5 seconds, release", cue: "Drop everything" },
      { instruction: "Scrunch your face as tight as possible, hold 5 seconds, release", cue: "Let it go smooth" },
      { instruction: "Scan your entire body — it should feel noticeably heavier and lighter at once", cue: "This is release" },
    ]
  },
  {
    id: "rain",
    name: "RAIN Method",
    tag: "Mindfulness therapy",
    tagline: "Move through difficult emotions, not around them.",
    science: "RAIN is used in MBSR (Mindfulness-Based Stress Reduction) and DBT therapy. It prevents emotional suppression (which amplifies feelings) and instead creates a compassionate internal relationship with your experience.",
    icon: Heart,
    color: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
    steps: [
      { instruction: "Recognize — Name what you're feeling right now", cue: '"I notice I am feeling anxious / sad / overwhelmed..."' },
      { instruction: "Allow — Don't push it away. Let it be there.", cue: '"This feeling is allowed to exist for now."' },
      { instruction: "Investigate — Where do you feel it in your body? What does it need?", cue: "Approach with genuine curiosity, not judgment" },
      { instruction: "Nurture — Offer yourself the kindness you'd offer a friend", cue: '"This is hard. I am doing my best. I am enough."' },
    ]
  },
];

interface TechniquePlayerProps {
  technique: Technique;
  onClose: () => void;
}

function TechniquePlayer({ technique, onClose }: TechniquePlayerProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [counting, setCounting] = useState(0);
  const [done, setDone] = useState(false);

  const startCounting = (duration: number) => {
    let count = duration;
    setTimer(count);
    setCounting(count);
    const interval = window.setInterval(() => {
      count--;
      setCounting(count);
      if (count <= 0) {
        clearInterval(interval);
        setTimer(null);
      }
    }, 1000);
  };

  const handleNext = () => {
    if (activeStep < technique.steps.length - 1) {
      setActiveStep(s => s + 1);
      setTimer(null);
      setCounting(0);
    } else {
      setDone(true);
    }
  };

  const currentStep = technique.steps[activeStep];

  if (done) {
    return (
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 bg-background">
        <button onClick={onClose} className="self-end p-2 text-muted-foreground mb-8">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
              <technique.icon className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-serif mb-4">Complete.</h2>
            <p className="text-muted-foreground text-lg mb-10">Your nervous system just received a real signal to relax.</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium"
            >
              Return
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] px-6 py-12 bg-background">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onClose} className="p-2 -ml-2 text-muted-foreground">
          <X className="w-6 h-6" />
        </button>
        <span className="text-muted-foreground text-sm font-medium">{activeStep + 1} / {technique.steps.length}</span>
      </div>

      <div className="w-full flex gap-1.5 mb-12">
        {technique.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              i <= activeStep ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-sm w-full"
          >
            {currentStep.duration && timer !== null ? (
              <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center mx-auto mb-8">
                <motion.span
                  key={counting}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-mono font-bold text-primary"
                >
                  {counting}
                </motion.span>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
                <technique.icon className="w-12 h-12 text-primary" />
              </div>
            )}

            <h3 className="text-2xl font-serif text-foreground mb-3 leading-snug">{currentStep.instruction}</h3>
            {currentStep.cue && (
              <p className="text-muted-foreground text-base italic mb-10">{currentStep.cue}</p>
            )}

            <div className="flex gap-3 justify-center mt-6">
              {currentStep.duration && timer === null && (
                <button
                  onClick={() => startCounting(currentStep.duration!)}
                  className="px-6 py-3 bg-secondary text-foreground rounded-full font-medium text-sm hover:bg-secondary/80 transition-colors"
                  data-testid={`btn-start-timer-${activeStep}`}
                >
                  Start Timer
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium"
                data-testid={`btn-next-step-${activeStep}`}
              >
                {activeStep < technique.steps.length - 1 ? "Next" : "Finish"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Techniques() {
  const [activeTechnique, setActiveTechnique] = useState<Technique | null>(null);

  if (activeTechnique) {
    return <TechniquePlayer technique={activeTechnique} onClose={() => setActiveTechnique(null)} />;
  }

  return (
    <PageTransition>
      <div className="px-6 pt-14 pb-32 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-serif tracking-tight mb-2">Calming Techniques</h1>
          <p className="text-muted-foreground">Five science-backed methods. Each one works differently — try them all.</p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {TECHNIQUES.map((tech, i) => (
            <motion.button
              key={tech.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => setActiveTechnique(tech)}
              className="bg-card border border-border rounded-3xl p-5 text-left w-full hover:shadow-sm transition-shadow"
              data-testid={`card-technique-${tech.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-2xl ${tech.color} flex items-center justify-center`}>
                  <tech.icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-1 block">{tech.tag}</span>
              <h3 className="text-lg font-semibold text-foreground mb-1">{tech.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{tech.tagline}</p>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-card border border-border rounded-3xl p-5"
        >
          <h3 className="font-semibold mb-2 text-sm">Which one should I use?</h3>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p><span className="text-foreground font-medium">Panic or sudden anxiety:</span> Physiological Sigh</p>
            <p><span className="text-foreground font-medium">Before performance or stress:</span> Box Breathing</p>
            <p><span className="text-foreground font-medium">Trouble sleeping:</span> 4-7-8 Breathing</p>
            <p><span className="text-foreground font-medium">Physical tension:</span> Progressive Relaxation</p>
            <p><span className="text-foreground font-medium">Emotional overwhelm:</span> RAIN Method</p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
