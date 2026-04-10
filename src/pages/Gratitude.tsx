import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Check, Flame, ChevronDown, ChevronUp } from "lucide-react";

const PROMPTS = [
  "Something small that went well today",
  "A person who made a difference in your life",
  "Something about yourself you appreciate",
  "A moment today that felt good, even briefly",
  "Something you usually take for granted",
  "A challenge that helped you grow",
];

interface GratitudeEntry {
  date: string;
  entries: string[];
  prompts: string[];
}

const getTodayKey = () => new Date().toISOString().split("T")[0];

const loadHistory = (): GratitudeEntry[] => {
  try {
    return JSON.parse(localStorage.getItem("reset-gratitude") || "[]");
  } catch {
    return [];
  }
};

const saveHistory = (history: GratitudeEntry[]) => {
  localStorage.setItem("reset-gratitude", JSON.stringify(history));
};

const getDailyPrompts = (dateKey: string): string[] => {
  const seed = dateKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = [...PROMPTS].sort((a, b) => {
    const ah = (seed * a.length) % PROMPTS.length;
    const bh = (seed * b.length) % PROMPTS.length;
    return ah - bh;
  });
  return shuffled.slice(0, 3);
};

const getStreak = (history: GratitudeEntry[]): number => {
  if (history.length === 0) return 0;
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (history.find((e) => e.date === key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

export default function Gratitude() {
  const todayKey = getTodayKey();
  const dailyPrompts = getDailyPrompts(todayKey);

  const [history, setHistory] = useState<GratitudeEntry[]>(loadHistory);
  const [entries, setEntries] = useState<string[]>(["", "", ""]);
  const [submitted, setSubmitted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const todayEntry = history.find((e) => e.date === todayKey);
  const streak = getStreak(history);

  useEffect(() => {
    if (todayEntry) {
      setEntries(todayEntry.entries);
      setSubmitted(true);
    }
  }, []);

  const handleSubmit = () => {
    if (entries.some((e) => e.trim().length === 0)) return;
    const newEntry: GratitudeEntry = {
      date: todayKey,
      entries,
      prompts: dailyPrompts,
    };
    const newHistory = [
      ...history.filter((e) => e.date !== todayKey),
      newEntry,
    ].sort((a, b) => b.date.localeCompare(a.date));
    setHistory(newHistory);
    saveHistory(newHistory);
    setSubmitted(true);
  };

  const formatDate = (key: string) => {
    const d = new Date(key + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <PageTransition>
      <div className="px-6 pt-14 pb-32 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-serif tracking-tight">Daily Gratitude</h1>
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full"
              >
                <Flame className="w-4 h-4" />
                <span className="text-sm font-semibold">{streak} day{streak !== 1 ? "s" : ""}</span>
              </motion.div>
            )}
          </div>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-muted-foreground text-sm mb-6">
                Three things. That's all. Studies show this rewires how your brain filters your day.
              </p>

              <div className="flex flex-col gap-5 mb-8">
                {dailyPrompts.map((prompt, i) => (
                  <motion.div
                    key={prompt}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-3xl p-5"
                  >
                    <label className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">
                      {i + 1} of 3
                    </label>
                    <p className="text-foreground font-medium mb-4">{prompt}</p>
                    <textarea
                      value={entries[i]}
                      onChange={(e) => {
                        const updated = [...entries];
                        updated[i] = e.target.value;
                        setEntries(updated);
                      }}
                      placeholder="Write anything, even a single word..."
                      rows={2}
                      className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none text-sm leading-relaxed"
                      data-testid={`input-gratitude-${i}`}
                    />
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={handleSubmit}
                disabled={entries.some((e) => e.trim().length === 0)}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-medium text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                data-testid="btn-submit-gratitude"
              >
                Save Today's Gratitude
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >
              <div className="bg-card border border-border rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Today's gratitude saved</h3>
                    <p className="text-muted-foreground text-sm">Come back tomorrow to keep your streak</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {(todayEntry?.prompts || dailyPrompts).map((prompt, i) => (
                    <div key={i} className="border-t border-border pt-3 first:border-0 first:pt-0">
                      <p className="text-xs text-muted-foreground mb-1">{prompt}</p>
                      <p className="text-foreground text-sm">{(todayEntry?.entries || entries)[i]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {streak > 1 && (
                <div className="bg-primary/10 rounded-2xl p-4 mb-6 flex items-center gap-3">
                  <Flame className="w-5 h-5 text-primary" />
                  <p className="text-primary font-medium text-sm">{streak}-day streak. You're building a real habit.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {history.filter((e) => e.date !== todayKey).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full py-3 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-toggle-history"
            >
              <span className="font-medium text-sm">Previous entries</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 pt-2">
                    {history
                      .filter((e) => e.date !== todayKey)
                      .slice(0, 7)
                      .map((entry) => (
                        <div
                          key={entry.date}
                          className="bg-card border border-border rounded-2xl p-4"
                        >
                          <p className="text-xs text-muted-foreground mb-3 font-medium">{formatDate(entry.date)}</p>
                          <div className="flex flex-col gap-2">
                            {entry.entries.map((e, i) => (
                              <p key={i} className="text-sm text-foreground leading-relaxed">
                                <span className="text-muted-foreground">{i + 1}. </span>{e}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
