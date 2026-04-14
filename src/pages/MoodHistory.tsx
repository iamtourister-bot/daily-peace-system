import { useEffect, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

interface MoodEntry {
  date: string;
  mood: string;
}

const MOOD_COLORS: Record<string, string> = {
  Calm: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  Okay: "bg-green-500/20 text-green-300 border-green-400/30",
  Low: "bg-slate-500/20 text-slate-300 border-slate-400/30",
  Anxious: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  Heavy: "bg-purple-500/20 text-purple-300 border-purple-400/30",
};

const MOOD_MESSAGES: Record<string, string> = {
  Calm: "A calm day. You carried it well.",
  Okay: "Steady. That counts for a lot.",
  Low: "A low day. You showed up anyway.",
  Anxious: "Anxiety visited. You got through it.",
  Heavy: "A heavy day. You still made it.",
};

const getWeeklySummary = (entries: MoodEntry[]): string => {
  if (entries.length === 0) return "No check-ins this week yet. Start tomorrow.";

  const moodCounts: Record<string, number> = {};
  entries.forEach(e => {
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });

  const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];
  const daysShown = entries.length;
  const hasHeavy = moodCounts["Heavy"] || moodCounts["Anxious"] || moodCounts["Low"];
  const hasCalm = moodCounts["Calm"] || moodCounts["Okay"];

  if (hasCalm && !hasHeavy) {
    return `A steady week. You showed up ${daysShown} ${daysShown === 1 ? "time" : "times"} and found your calm. Hold onto that.`;
  }
  if (hasHeavy && hasCalm) {
    return `This week had heavy moments and calm ones. You showed up ${daysShown} ${daysShown === 1 ? "time" : "times"}. That balance is real.`;
  }
  if (mostCommon === "Heavy" || mostCommon === "Anxious") {
    return `A heavy week. But you checked in ${daysShown} ${daysShown === 1 ? "time" : "times"}. That means you were paying attention. That matters.`;
  }
  if (mostCommon === "Low") {
    return `Some low days this week. You still showed up ${daysShown} ${daysShown === 1 ? "time" : "times"}. That's not nothing — that's everything.`;
  }
  return `You checked in ${daysShown} ${daysShown === 1 ? "time" : "times"} this week. Every moment you paused for yourself counts.`;
};

const getLast7Days = (): string[] => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const formatDay = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

const formatFullDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function MoodHistory() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [last7, setLast7] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("reset_mood_history");
    const history: MoodEntry[] = raw ? JSON.parse(raw) : [];
    setEntries(history);
    setLast7(getLast7Days());
  }, []);

  const getEntryForDate = (date: string): MoodEntry | undefined => {
    return entries.find(e => e.date === date);
  };

  const weekEntries = last7.map(d => getEntryForDate(d)).filter(Boolean) as MoodEntry[];

  return (
    <PageTransition>
      <div className="px-6 pt-14 pb-32 min-h-screen">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif text-foreground">Your Week</h1>
            <p className="text-muted-foreground text-sm">How you have been feeling</p>
          </div>
        </div>

        {/* Weekly summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-5 mb-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">This week</p>
          <p className="text-foreground text-base leading-relaxed font-serif">
            {getWeeklySummary(weekEntries)}
          </p>
        </motion.div>

        {/* 7 day grid */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {last7.map((date, i) => {
            const entry = getEntryForDate(date);
            const isToday = date === new Date().toISOString().split("T")[0];
            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className={`text-[10px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {formatDay(date)}
                </span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                  entry
                    ? MOOD_COLORS[entry.mood] || "bg-secondary border-border"
                    : "bg-secondary/30 border-border/30"
                }`}>
                  {entry ? (
                    <span className="text-[10px] font-bold">{entry.mood[0]}</span>
                  ) : (
                    <span className="text-muted-foreground/30 text-xs">—</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Daily entries */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily log</p>
          {last7.map((date, i) => {
            const entry = getEntryForDate(date);
            const isToday = date === new Date().toISOString().split("T")[0];
            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`p-4 rounded-2xl border ${
                  entry
                    ? "bg-card border-border"
                    : "bg-secondary/20 border-border/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${entry ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {isToday ? "Today" : formatFullDate(date)}
                      </p>
                      {entry && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {MOOD_MESSAGES[entry.mood] || "You checked in."}
                        </p>
                      )}
                      {!entry && (
                        <p className="text-xs text-muted-foreground/50 mt-0.5">No check-in</p>
                      )}
                    </div>
                  </div>
                  {entry && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${MOOD_COLORS[entry.mood] || "bg-secondary text-foreground border-border"}`}>
                      {entry.mood}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Encouragement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 p-5 bg-primary/5 border border-primary/20 rounded-3xl text-center"
        >
          <p className="text-foreground font-serif text-base leading-relaxed">
            Every check-in is an act of self-awareness. That is the foundation of everything.
          </p>
        </motion.div>

      </div>
    </PageTransition>
  );
}
