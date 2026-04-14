import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSession } from "@/contexts/SessionContext";
import { Link, useLocation } from "wouter";
import { Moon, Sun, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";

const NATURE_SCENES = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80" },
  { url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80" },
  { url: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&auto=format&fit=crop&q=80" },
];

const AFFIRMATION_SCENES = [
  "https://images.unsplash.com/photo-1490079027102-cd08f2308818?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
];

const AFFIRMATIONS = [
  "I am allowed to take up space.",
  "Moving slowly is still moving.",
  "I may not be where I want yet — and that's okay.",
  "I am allowed to rest without earning it first.",
  "This moment is enough for now.",
  "I don't have to be okay to be worthy.",
  "Some days just need to be survived. That counts.",
  "I am not behind. I am on my own path.",
  "This anxious feeling will pass. It always does.",
  "I have already done hard things. This is another one.",
  "Peace is not something I find. It is something I return to.",
  "Fear can be loud. It doesn't mean it's right.",
  "Let today be lighter than yesterday. Even slightly.",
  "My body is carrying a lot. I will be gentle with it.",
  "It is okay to not know what comes next.",
  "I am not my worst day.",
  "Breathe first. Decide later.",
  "I deserve the same patience I give others.",
  "Healing is not linear. Neither am I.",
  "Hard days happen. They don't erase who I am.",
  "Not everything needs a solution right now.",
  "I showed up today. That was enough.",
  "The noise outside does not define what is inside.",
  "I am more than what I produce.",
  "Stillness is not emptiness. It is recovery.",
  "I don't have to feel strong to keep going.",
  "I don't need to have everything figured out today.",
  "I am not alone in feeling this way.",
  "One breath at a time is a perfectly valid pace.",
  "I came back today. That matters more than I know.",
];

const getDailyScene = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return NATURE_SCENES[dayOfYear % NATURE_SCENES.length];
};

const getDailyAffirmation = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return {
    text: AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length],
    scene: AFFIRMATION_SCENES[dayOfYear % AFFIRMATION_SCENES.length],
  };
};

const MOOD_KEY = "reset_mood_checkin";

const MOODS = [
  { label: "Okay", color: "bg-green-500/20 border-green-400/40 text-green-100" },
  { label: "Calm", color: "bg-blue-500/20 border-blue-400/40 text-blue-100" },
  { label: "Low", color: "bg-slate-500/20 border-slate-400/40 text-slate-100" },
  { label: "Anxious", color: "bg-amber-500/20 border-amber-400/40 text-amber-100" },
  { label: "Heavy", color: "bg-purple-500/20 border-purple-400/40 text-purple-100" },
];

const RESPONSES: Record<string, { message: string; action?: { label: string; href: string } }> = {
  Okay: { message: "Okay. Let's keep things steady." },
  Calm: { message: "That's good. Stay with it." },
  Low: { message: "That's okay. You're not alone in it.", action: { label: "Take a gentle moment", href: "/quick-reset" } },
  Anxious: { message: "Let's take one breath together.", action: { label: "30 second reset", href: "/quick-reset" } },
  Heavy: { message: "That's a lot to carry. You don't have to do it alone.", action: { label: "Take a moment", href: "/state" } },
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export default function Welcome() {
  const { theme, toggleTheme } = useTheme();
  const { timeOfDay } = useSession();
  const [, setLocation] = useLocation();
  const scene = getDailyScene();
  const daily = getDailyAffirmation();

  const [checkedIn, setCheckedIn] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showAffirmation, setShowAffirmation] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(MOOD_KEY);
    if (saved) {
      const { date, mood } = JSON.parse(saved);
      if (date === getTodayKey()) {
        setCheckedIn(true);
        setSelectedMood(mood);
      }
    }
  }, []);

  const handleMood = (mood: string) => {
    localStorage.setItem(MOOD_KEY, JSON.stringify({ date: getTodayKey(), mood }));
    setSelectedMood(mood);
    setCheckedIn(true);

    const historyKey = "reset_mood_history";
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const today = getTodayKey();
    const filtered = history.filter((entry: any) => entry.date !== today);
    filtered.unshift({ date: today, mood });
    localStorage.setItem(historyKey, JSON.stringify(filtered.slice(0, 30)));
  };

  const getGreeting = () => {
    switch (timeOfDay) {
      case "morning": return "Good morning — Ready to take a moment just for you?";
      case "afternoon": return "Good afternoon. A moment to recenter.";
      case "evening": return "Good evening — Ready to slow down and unwind?";
      case "night": return "It's late. Rest is within reach.";
    }
  };

  const getButtonText = () => {
    switch (timeOfDay) {
      case "morning": return "Begin morning reset";
      case "afternoon": return "Begin your reset";
      case "evening": return "Begin wind down";
      case "night": return "Find some rest";
    }
  };

  const response = selectedMood ? RESPONSES[selectedMood] : null;

  return (
    <PageTransition>
      {/* Affirmation full screen overlay */}
      <AnimatePresence>
        {showAffirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            onClick={() => setShowAffirmation(false)}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${daily.scene})` }}
            />
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative z-10 px-10 text-center"
            >
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">
                A quiet note for today
              </p>
              <p className="text-white text-2xl font-serif leading-relaxed">
                {daily.text}
              </p>
              <p className="text-white/30 text-xs mt-10">
                Tap anywhere to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${scene.url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/80" />

        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2.5 text-white/70 hover:text-white transition-colors z-10 bg-black/20 rounded-full backdrop-blur-sm"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="flex-1 flex flex-col justify-between px-8 py-12 relative z-10">

          {/* Top — Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-3">Reset</p>
            <h1 className="text-4xl font-serif text-white leading-tight">{getGreeting()}</h1>
          </motion.div>

          {/* Middle — Mood Check In */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-start justify-center flex-1 py-8"
          >
            <AnimatePresence mode="wait">
              {!checkedIn ? (
                <motion.div
                  key="checkin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="w-full"
                >
                  <p className="text-white/80 text-base mb-5">How are you feeling today?</p>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    {MOODS.map((mood) => (
                      <button
                        key={mood.label}
                        onClick={() => handleMood(mood.label)}
                        className={`px-4 py-3 rounded-full border backdrop-blur-sm text-sm font-medium transition-all hover:scale-105 active:scale-95 ${mood.color}`}
                      >
                        {mood.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="w-full"
                >
                  <p className="text-white/90 text-xl font-serif mb-3">
                    {response?.message || "You showed up today 💚"}
                  </p>
                  {response?.action && (
                    <button
                      onClick={() => setLocation(response.action!.href)}
                      className="text-white/70 text-sm underline underline-offset-4 hover:text-white transition-colors"
                    >
                      {response.action.label}
                    </button>
                  )}

                  {/* Affirmation card — optional, soft */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => setShowAffirmation(true)}
                    className="mt-6 w-full text-left px-4 py-3 bg-white/8 border border-white/15 rounded-2xl backdrop-blur-sm hover:bg-white/12 transition-colors"
                  >
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">A quiet note for today</p>
                    <p className="text-white/70 text-sm font-serif line-clamp-1">{daily.text}</p>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bottom — Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Link href="/state">
              <button className="w-full bg-white/15 text-white py-4 rounded-2xl font-medium text-lg border border-white/30 backdrop-blur-sm hover:bg-white/25 transition-colors flex items-center justify-center gap-2">
                {getButtonText()}
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/quick-reset">
              <button className="w-full mt-3 text-white/70 py-3 rounded-2xl font-medium text-base hover:text-white transition-colors">
                30-second reset
              </button>
            </Link>
          </motion.div>

        </div>
      </div>
    </PageTransition>
  );
}
