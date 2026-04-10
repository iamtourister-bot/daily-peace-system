import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Mic, Check } from "lucide-react";

type Mood = "overwhelmed" | "anxious" | "angry" | "sad" | "vent";

const moodOptions: { label: string; value: Mood }[] = [
  { label: "Overwhelmed", value: "overwhelmed" },
  { label: "Anxious", value: "anxious" },
  { label: "Angry", value: "angry" },
  { label: "Sad", value: "sad" },
  { label: "Just need to vent", value: "vent" },
];

const responses: Record<Mood, string[]> = {
  overwhelmed: [
    "That sounded like a lot to carry. I'm really glad you let it out.",
    "You're handling more than most people realize. And you still showed up.",
    "You don't have to figure everything out right now. One moment at a time.",
    "That couldn't have been easy to carry alone. You're not alone in this moment.",
  ],
  anxious: [
    "It's okay to feel unsettled. You're not alone in this.",
    "Whatever you just said — it mattered. Your feelings are real.",
    "You got it out. That's a good step. Breathe. You're okay.",
    "Anxiety can feel so loud. You were brave enough to speak anyway.",
  ],
  angry: [
    "That sounds like a lot to carry. I'm glad you let it out.",
    "I hear you. Even if it's messy, it's real — and it deserved to be heard.",
    "You didn't keep it bottled up this time. That's a big step.",
    "That couldn't have been easy to say. I'm here with you.",
  ],
  sad: [
    "Whatever you just said… it matters. You matter.",
    "I hear you. Sadness deserves space too — you don't have to rush past it.",
    "You showed up for yourself just now. Even when it's heavy. That counts.",
    "You're not alone in this moment. Not even a little.",
  ],
  vent: [
    "You got it out. That's a good step.",
    "I heard every word. You didn't have to hold that in.",
    "Sometimes you just need to say it. No fixing. No advice. Just heard.",
    "That's real. And you're real. And that's enough right now.",
  ],
};

const followUps: Record<Mood, string[]> = {
  overwhelmed: [
    "Is there one small thing you can set down for today?",
    "Or… we can just sit with that for a moment.",
  ],
  anxious: [
    "Do you want to say a little more about it?",
    "Or… we can just sit with that for a moment.",
  ],
  angry: [
    "Is there something you need right now — even something small?",
    "Or… we can just sit with that for a moment.",
  ],
  sad: [
    "Do you want to say a little more about how you're feeling?",
    "Or… we can just sit with that for a moment.",
  ],
  vent: [
    "Is there one small thing you can let go of today?",
    "Or… we can just sit with that for a moment.",
  ],
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Speak() {
  const [phase, setPhase] = useState<"mood" | "start" | "listening" | "silent" | "response">("mood");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [response, setResponse] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (phase === "listening") {
      const timer = setTimeout(() => {
        setPhase("silent");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "silent") {
      const timer = setTimeout(() => {
        const mood = selectedMood || "vent";
        setResponse(getRandomItem(responses[mood]));
        setQuestions(followUps[mood]);
        setPhase("response");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, selectedMood]);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setPhase("start");
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 relative bg-background">
        <h1 className="text-3xl font-serif tracking-tight mb-2">Speak & Release</h1>
        <p className="text-muted-foreground mb-12">You can say anything here. Just let it out.</p>

        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">

            {/* Step 1 — Mood Selection */}
            {phase === "mood" && (
              <motion.div
                key="mood"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex flex-col items-center text-center"
              >
                <p className="text-xl font-medium text-foreground mb-2">How are you feeling?</p>
                <p className="text-muted-foreground mb-8">Optional — just helps us be there for you better.</p>
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => handleMoodSelect(mood.value)}
                      className="px-5 py-3 rounded-full border border-border text-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleMoodSelect("vent")}
                  className="text-muted-foreground text-sm underline underline-offset-4"
                >
                  Skip — just let me speak
                </button>
              </motion.div>
            )}

            {/* Step 2 — Tap to Speak */}
            {phase === "start" && (
              <motion.div
                key="start"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
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

            {/* Step 3 — Listening */}
            {phase === "listening" && (
              <motion.div
                key="listening"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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

            {/* Step 4 — Silent Moment */}
            {phase === "silent" && (
              <motion.div
                key="silent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center"
              >
                <p className="text-2xl font-serif text-foreground">I'm here.</p>
              </motion.div>
            )}

            {/* Step 5 — Response */}
            {phase === "response" && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-6">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-serif text-center mb-6 text-foreground">We heard you.</h2>

                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm mb-8 w-full text-center">
                  <p className="text-lg italic text-muted-foreground">"{response}"</p>
                </div>

                <div className="w-full flex flex-col gap-3">
                  {questions.map((q, i) => (
                    <div key={i} className="bg-secondary/50 p-4 rounded-xl text-sm text-foreground">
                      {q}
                    </div>
                  ))}
                </div>

                <Link href="/insight" className="w-full mt-10">
                  <button className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium">
                    Complete Session
                  </button>
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
