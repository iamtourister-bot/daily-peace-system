import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Mic, Check, Heart } from "lucide-react";

type Mood = "overwhelmed" | "anxious" | "angry" | "sad" | "vent";
type Mode = "release" | "heard" | null;

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

// Keyword-based personal responses
function getPersonalResponse(transcript: string, mood: Mood): string {
  const text = transcript.toLowerCase();

  if (text.includes("work") || text.includes("job") || text.includes("boss"))
    return "Work pressure is real and exhausting. You're carrying a lot — and you still showed up for yourself today.";
  if (text.includes("family") || text.includes("mom") || text.includes("dad") || text.includes("parents"))
    return "Family relationships can be the heaviest weight. It's okay to feel what you feel about the people closest to you.";
  if (text.includes("relationship") || text.includes("partner") || text.includes("boyfriend") || text.includes("girlfriend"))
    return "Relationships touch the deepest parts of us. Whatever you're feeling right now — it's valid and it matters.";
  if (text.includes("money") || text.includes("financial") || text.includes("broke") || text.includes("debt"))
    return "Financial stress is one of the hardest things to carry. You're not alone in this — and you're doing better than you think.";
  if (text.includes("lonely") || text.includes("alone") || text.includes("nobody"))
    return "Loneliness is one of the hardest feelings. But right now, in this moment, you're not alone. We're here with you.";
  if (text.includes("tired") || text.includes("exhausted") || text.includes("sleep"))
    return "Being tired goes beyond just sleep sometimes. Your mind and body are asking for rest — and that's okay.";
  if (text.includes("scared") || text.includes("fear") || text.includes("afraid"))
    return "Fear is your mind trying to protect you. You were brave enough to speak it out loud — that takes real courage.";
  if (text.includes("angry") || text.includes("mad") || text.includes("frustrated"))
    return "That anger makes sense. You don't have to justify it. Letting it out is already a healthy step.";
  if (text.includes("sad") || text.includes("cry") || text.includes("crying"))
    return "Tears are not weakness — they're honesty. Whatever brought you here today, you're allowed to feel it fully.";
  if (text.includes("happy") || text.includes("good") || text.includes("better"))
    return "It's beautiful that you're feeling some light today. Hold onto that — you deserve every bit of it.";

  // Default based on mood
  const mood_responses = responses[mood];
  return mood_responses[Math.floor(Math.random() * mood_responses.length)];
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Speak() {
  const [phase, setPhase] = useState<"choose" | "mood" | "start" | "listening" | "silent" | "response">("choose");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode>(null);
  const [response, setResponse] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Volume animation
  useEffect(() => {
    if (isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const tick = () => {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setVolume(avg);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      }).catch(() => setVolume(0));
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setVolume(0);
    }
  }, [isListening]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (selectedMode === "heard" && SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let full = "";
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript + " ";
        }
        setTranscript(full.trim());
      };

      recognition.start();
      recognitionRef.current = recognition;
    }

    setIsListening(true);
    setPhase("listening");
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setPhase("silent");
  };

  useEffect(() => {
    if (phase === "silent") {
      const timer = setTimeout(() => {
        const mood = selectedMood || "vent";
        if (selectedMode === "heard" && transcript) {
          setResponse(getPersonalResponse(transcript, mood));
        } else {
          setResponse(getRandomItem(responses[mood]));
        }
        setQuestions(followUps[mood]);
        setPhase("response");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, selectedMood, selectedMode, transcript]);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setPhase("start");
  };

  const micScale = 1 + (volume / 255) * 0.5;

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 relative bg-background">
        <h1 className="text-3xl font-serif tracking-tight mb-2">Speak & Release</h1>
        <p className="text-muted-foreground mb-12">You can say anything here. Just let it out.</p>

        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">

           {/* Step 0 — Choose Mode */}
{phase === "choose" && (
  <motion.div
    key="choose"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="w-full flex flex-col items-center text-center"
  >
    <p className="text-xl font-medium text-foreground mb-10">
      How would you like to be heard?
    </p>

    <div className="w-full flex flex-col gap-4">
      <button
        onClick={() => { setSelectedMode("release"); setPhase("mood"); }}
        className="w-full p-5 rounded-3xl border border-border bg-card text-left hover:border-primary transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Speak & Release</p>
            <p className="text-muted-foreground text-xs">Just let it out</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => { setSelectedMode("heard"); setPhase("mood"); }}
        className="w-full p-5 rounded-3xl border border-border bg-card text-left hover:border-primary transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Speak & Be Heard</p>
            <p className="text-muted-foreground text-xs">Get a personal response</p>
          </div>
        </div>
      </button>
    </div>

    <p className="text-xs text-muted-foreground mt-6 px-4">
      💡 Speak & Be Heard uses your mic to personalise your response.
    </p>
  </motion.div>
)}

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
                  onClick={startListening}
                  className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors mb-8"
                >
                  <Mic className="w-10 h-10" />
                </button>
                <p className="text-xl text-foreground font-medium">Tap to speak</p>
                <p className="text-muted-foreground mt-2">
                  {selectedMode === "heard"
                    ? "We'll listen and respond personally to what you share."
                    : "Say whatever is on your mind. We're listening."}
                </p>
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
                {/* Mic reacts to voice volume */}
                <div className="relative flex items-center justify-center mb-8">
                  <motion.div
                    animate={{ scale: micScale }}
                    transition={{ duration: 0.1 }}
                    className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30"
                  >
                    <Mic className="w-10 h-10" />
                  </motion.div>
                  {/* Outer pulse rings reacting to volume */}
                  <motion.div
                    animate={{ scale: micScale * 1.3, opacity: volume > 10 ? 0.3 : 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute w-32 h-32 rounded-full bg-primary/10"
                  />
                  <motion.div
                    animate={{ scale: micScale * 1.6, opacity: volume > 20 ? 0.15 : 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute w-32 h-32 rounded-full bg-primary/10"
                  />
                </div>

                <p className="text-xl text-foreground font-medium">Listening...</p>
                <p className="text-muted-foreground mt-2">Take your time. Speak until you're empty.</p>

                {/* Done button — user controls when to finish */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3 }}
                  onClick={stopListening}
                  className="mt-12 px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium"
                >
                  Done Speaking
                </motion.button>
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
