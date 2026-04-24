import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Play, X, ChevronRight, ArrowLeft, Volume2 } from "lucide-react";

const NATURE_IMAGES = {
  forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
  ocean: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=80",
  meadow: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&auto=format&fit=crop&q=80",
  sunrise: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
};

interface MeditationStep {
  text: string;
  duration: number;
}

interface Meditation {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: string;
  intro: string;
  audioUrl?: string;
  steps: MeditationStep[];
}

const MEDITATIONS: Meditation[] = [
  {
    id: "morning",
    title: "Morning Clarity",
    subtitle: "Start with intention",
    image: NATURE_IMAGES.sunrise,
    tag: "Morning",
    intro: "A gentle way to open the day. Let the night release from your body.",
    audioUrl: "/daily-peace-system/morning-clarity.mp3",
    steps: [
      { text: "Get comfortable. Clear your mind and follow each instruction as it appears.", duration: 5000 },
      { text: "Take a slow breath in... and let it go.", duration: 10000 },
      { text: "Notice your body. Just observe.", duration: 12000 },
      { text: "Think of one thing you are stepping into today.", duration: 12000 },
      { text: "How do you want to move through this day?", duration: 14000 },
      { text: "Breathe in: I am present. Breathe out: I am ready.", duration: 14000 },
      { text: "Carry this stillness into your morning.", duration: 12000 },
    ]
  },
  {
    id: "anxiety",
    title: "Anxiety Relief",
    subtitle: "Quiet the storm inside",
    image: NATURE_IMAGES.ocean,
    tag: "Anxiety",
    intro: "When your mind is racing, this session helps you return to your body.",
    audioUrl: "/daily-peace-system/anxiety-relief.mp3",
    steps: [
      { text: "Get comfortable. Clear your mind and follow each instruction as it appears.", duration: 5000 },
      { text: "Place both feet on the floor. Feel the ground holding you.", duration: 12000 },
      { text: "Place one hand on your chest. Feel it rise and fall.", duration: 12000 },
      { text: "Breathe in for 4... hold for 2... out for 6.", duration: 16000 },
      { text: "Your thoughts are not facts. They pass like weather.", duration: 14000 },
      { text: "Name three things you can feel right now.", duration: 16000 },
      { text: "The feeling is not permanent. You are descending from it.", duration: 14000 },
      { text: "Just one more breath. You are here. You are safe.", duration: 14000 },
    ]
  },
  {
    id: "sleep",
    title: "Sleep Preparation",
    subtitle: "Let the day dissolve",
    image: NATURE_IMAGES.mountain,
    tag: "Night",
    intro: "Your body knows how to sleep. This helps your mind step aside.",
    steps: [
      { text: "Lie down and get still. The day is done.", duration: 5000 },
      { text: "Let your toes go. Release them.", duration: 12000 },
      { text: "Your legs... heavy and soft.", duration: 12000 },
      { text: "Your back... your belly... sinking down.", duration: 14000 },
      { text: "Your shoulders... dropping.", duration: 12000 },
      { text: "Your face... smooth and still.", duration: 12000 },
      { text: "Floating. Supported. Nothing to solve.", duration: 16000 },
      { text: "Thoughts come... let them pass.", duration: 14000 },
      { text: "You are safe. Everything is handled.", duration: 14000 },
      { text: "Nothing more to do. Just drift.", duration: 16000 },
    ]
  },
  {
    id: "body",
    title: "Body Release",
    subtitle: "Let tension melt away",
    image: NATURE_IMAGES.meadow,
    tag: "Tension",
    intro: "We carry emotion in our muscles. This releases what you have been holding.",
    steps: [
      { text: "Sit or lie comfortably. We will move through your body slowly.", duration: 5000 },
      { text: "Curl your toes tightly... hold... release.", duration: 12000 },
      { text: "Tighten your thighs... hold... let go.", duration: 12000 },
      { text: "Suck in your stomach... hold... exhale and soften.", duration: 14000 },
      { text: "Shrug your shoulders to your ears... hold... drop.", duration: 12000 },
      { text: "Scrunch your face... hold... smooth it out.", duration: 12000 },
      { text: "Scan your body. Feel how much lighter it is.", duration: 14000 },
    ]
  },
  {
    id: "peace",
    title: "Inner Peace",
    subtitle: "Return to your center",
    image: NATURE_IMAGES.forest,
    tag: "Deep Calm",
    intro: "For when you want to remember who you are beneath the noise.",
    steps: [
      { text: "Settle in. There is nowhere to be but here.", duration: 5000 },
      { text: "Breathe naturally. Just watch it rise and fall.", duration: 12000 },
      { text: "Imagine a place where you feel at ease.", duration: 14000 },
      { text: "Here you do not need to perform. You are enough.", duration: 14000 },
      { text: "Notice any tightness in your heart. You have been carrying this.", duration: 14000 },
      { text: "Set it down for a while. Just rest it.", duration: 14000 },
      { text: "Who are you without the worry? Sit with that.", duration: 16000 },
      { text: "You have survived everything that tried to break you.", duration: 14000 },
      { text: "Breathe in: I am enough. Breathe out: I release.", duration: 14000 },
      { text: "You have a center. You can always find your way back.", duration: 14000 },
    ]
  }
];

const POST_FEELINGS = [
  { label: "Calmer", emoji: "🌿" },
  { label: "Lighter", emoji: "☁️" },
  { label: "Still heavy", emoji: "💙" },
  { label: "Grateful", emoji: "💚" },
  { label: "Tired", emoji: "🌙" },
];

export default function Meditations() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<Meditation | null>(null);
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [postFeeling, setPostFeeling] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startMeditation = (med: Meditation) => {
    setSelected(med);
    setPlaying(false);
    setStepIndex(0);
    setDone(false);
    setPostFeeling(null);
  };

  const beginPlaying = () => {
    setPlaying(true);
    if (selected?.audioUrl) {
      const audio = new Audio(selected.audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => {
        setDone(true);
        setPlaying(false);
      };
    } else {
      advanceStep(0, selected!);
    }
  };

  const advanceStep = (idx: number, med: Meditation) => {
    if (idx >= med.steps.length) {
      setDone(true);
      setPlaying(false);
      return;
    }
    setStepIndex(idx);
    setTimeout(() => advanceStep(idx + 1, med), med.steps[idx].duration);
  };

  const exitMeditation = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSelected(null);
    setPlaying(false);
    setStepIndex(0);
    setDone(false);
    setPostFeeling(null);
  };

  if (selected && playing) {
    return (
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.image})` }} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-48 h-48 rounded-full bg-white/5 border border-white/10"
          />
        </div>
        <button onClick={exitMeditation} className="absolute top-6 right-6 z-20 p-2 text-white/50 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        {selected.audioUrl ? (
          <div className="absolute top-6 left-6 right-16 z-20 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-white/40" />
            <p className="text-white/40 text-xs uppercase tracking-widest">Now playing</p>
          </div>
        ) : (
          <div className="absolute top-6 left-6 right-16 z-20">
            <div className="flex gap-1">
              {selected.steps.map((_, i) => (
                <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors duration-1000 ${i <= stepIndex ? "bg-white/60" : "bg-white/15"}`} />
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          {selected.audioUrl ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <p className="text-white/50 text-sm uppercase tracking-widest mb-4">{selected.title}</p>
              <p className="text-white/30 text-sm mt-8">Close your eyes and listen</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="text-center"
              >
                <p className="text-white text-2xl font-serif leading-relaxed">{selected.steps[stepIndex].text}</p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        <div className="relative z-10 text-center pb-12 px-6">
          <p className="text-white/30 text-sm">{selected.title}</p>
        </div>
      </div>
    );
  }

  if (selected && done) {
    return (
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.image})` }} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="w-full max-w-sm">
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-8">
              <div className="w-8 h-8 rounded-full bg-white/20" />
            </div>
            <h2 className="text-3xl font-serif text-white mb-3">Well done.</h2>
            <p className="text-white/70 text-lg mb-10">You showed up for yourself. That matters.</p>
            {!postFeeling ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <p className="text-white/80 text-base mb-5">How do you feel right now?</p>
                <div className="flex flex-wrap gap-3 justify-center mb-8">
                  {POST_FEELINGS.map((f) => (
                    <button key={f.label} onClick={() => setPostFeeling(f.label)} className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors">
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                <p className="text-white/80 text-lg font-serif mb-6">
                  {postFeeling === "Calmer" && "That's the reset working. Hold onto it."}
                  {postFeeling === "Lighter" && "Good. You put something down just now."}
                  {postFeeling === "Still heavy" && "That's okay. You still showed up. That counts."}
                  {postFeeling === "Grateful" && "Gratitude after stillness is real. Carry that."}
                  {postFeeling === "Tired" && "Rest is the right response. Let yourself be tired."}
                </p>
              </motion.div>
            )}
            <button onClick={exitMeditation} className="px-8 py-3 bg-white/20 text-white rounded-full border border-white/30 font-medium hover:bg-white/30 transition-colors">
              Return
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.image})` }} />
        <div className="absolute inset-0 bg-black/55" />
        <button onClick={exitMeditation} className="absolute top-6 left-6 z-20 p-2 text-white/70 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex flex-col justify-end p-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3 block">{selected.tag}</span>
            <h1 className="text-4xl font-serif text-white mb-2">{selected.title}</h1>
            <p className="text-white/50 text-sm mb-6">{selected.audioUrl ? "Guided audio meditation" : "Guided moment"}</p>
            <p className="text-white/80 text-lg leading-relaxed mb-10">{selected.intro}</p>
            <button onClick={beginPlaying} className="w-full py-4 bg-white/20 border border-white/40 text-white rounded-2xl font-medium text-lg backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center gap-3">
              <Play className="w-5 h-5" />
              Begin when ready
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="px-6 pt-14 pb-32 min-h-screen">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-serif tracking-tight mb-2">Guided Meditations</h1>
          <p className="text-muted-foreground">Choose a session. Find your still point.</p>
        </motion.div>
        <div className="flex flex-col gap-4">
          {MEDITATIONS.map((med, i) => (
            <motion.button
              key={med.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => startMeditation(med)}
              className="relative rounded-3xl overflow-hidden h-44 w-full text-left"
            >
              <img src={med.image} alt={med.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1 block">{med.tag}</span>
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-white text-xl font-serif">{med.title}</h3>
                    <p className="text-white/70 text-sm">{med.subtitle}</p>
                  </div>
                  {med.audioUrl && (
                    <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-full">
                      <Volume2 className="w-3 h-3 text-white/70" />
                      <span className="text-white/70 text-xs">Audio</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
