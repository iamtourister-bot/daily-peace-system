import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, PenLine, Clock, Mail, MailOpen, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface Letter {
  id: string;
  content: string;
  createdAt: string;
  deliverAt: string;
  delivered: boolean;
}

const STORAGE_KEY = "reset_letters";

const getLetters = (): Letter[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveLetters = (letters: Letter[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
};

const DELIVERY_OPTIONS = [
  { label: "7 days", days: 7, desc: "A week from now" },
  { label: "30 days", days: 30, desc: "A month from now" },
  { label: "90 days", days: 90, desc: "Three months from now" },
];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
};

const getDaysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function LetterToSelf() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState("");
  const [selectedDays, setSelectedDays] = useState(30);
  const [view, setView] = useState<"active" | "past">("active");
  const [revealLetter, setRevealLetter] = useState<Letter | null>(null);

  useEffect(() => {
    const all = getLetters();
    // Mark delivered
    const now = Date.now();
    const updated = all.map(l => ({
      ...l,
      delivered: l.delivered || new Date(l.deliverAt).getTime() <= now,
    }));
    saveLetters(updated);
    setLetters(updated);

    // Show reveal for first unread delivered letter
    const toReveal = updated.find(l => l.delivered && !l.content.startsWith("__read__"));
    if (toReveal) setRevealLetter(toReveal);
  }, []);

  const handleSend = () => {
    if (!content.trim()) return;
    const deliverAt = new Date();
    deliverAt.setDate(deliverAt.getDate() + selectedDays);
    const newLetter: Letter = {
      id: Date.now().toString(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      deliverAt: deliverAt.toISOString(),
      delivered: false,
    };
    const updated = [newLetter, ...letters];
    saveLetters(updated);
    setLetters(updated);
    setContent("");
    setWriting(false);
  };

  const handleDelete = (id: string) => {
    const updated = letters.filter(l => l.id !== id);
    saveLetters(updated);
    setLetters(updated);
  };

  const handleRevealClose = () => {
    if (!revealLetter) return;
    const updated = letters.map(l =>
      l.id === revealLetter.id
        ? { ...l, content: l.content.startsWith("__read__") ? l.content : "__read__" + l.content }
        : l
    );
    saveLetters(updated);
    setLetters(updated);
    setRevealLetter(null);
  };

  const getDisplayContent = (content: string) =>
    content.startsWith("__read__") ? content.replace("__read__", "") : content;

  const activeLetters = letters.filter(l => !l.delivered);
  const pastLetters = letters.filter(l => l.delivered);

  return (
    <PageTransition>
      {/* Reveal overlay */}
      <AnimatePresence>
        {revealLetter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="w-full max-w-sm"
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2 text-center">
                You wrote this to yourself
              </p>
              <p className="text-white/60 text-sm text-center mb-8">
                on {formatDate(revealLetter.createdAt)}
              </p>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
                <p className="text-white text-base leading-relaxed font-serif">
                  {getDisplayContent(revealLetter.content)}
                </p>
              </div>

              <p className="text-white/40 text-sm text-center mb-8 italic">
                That version of you believed in this one.
              </p>

              <button
                onClick={handleRevealClose}
                className="w-full py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-medium hover:bg-white/15 transition-colors"
              >
                I have read this
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6 pt-14 pb-32 min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif text-foreground">Letter to Myself</h1>
            <p className="text-muted-foreground text-sm">Words from you, for you</p>
          </div>
        </div>

        {/* Write button */}
        {!writing && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setWriting(true)}
            className="w-full p-5 bg-primary/10 border border-primary/30 rounded-3xl flex items-center gap-4 mb-6 hover:bg-primary/15 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Write a letter</p>
              <p className="text-muted-foreground text-sm">To your future self</p>
            </div>
          </motion.button>
        )}

        {/* Writing form */}
        <AnimatePresence>
          {writing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-card border border-border rounded-3xl p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Dear future me,
                </p>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write whatever feels true right now. How you feel. What you hope for. What you want to remember..."
                  className="w-full h-40 bg-transparent text-foreground text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/50"
                  autoFocus
                />
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Deliver in
              </p>
              <div className="flex gap-2 mb-4">
                {DELIVERY_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => setSelectedDays(opt.days)}
                    className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-colors ${
                      selectedDays === opt.days
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setWriting(false); setContent(""); }}
                  className="flex-1 py-3 bg-secondary border border-border rounded-2xl text-muted-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!content.trim()}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl font-medium disabled:opacity-40"
                >
                  Send to future me
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {["active", "past"].map(tab => (
            <button
              key={tab}
              onClick={() => setView(tab as "active" | "past")}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                view === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {tab === "active" ? `Waiting (${activeLetters.length})` : `Delivered (${pastLetters.length})`}
            </button>
          ))}
        </div>

        {/* Active letters */}
        {view === "active" && (
          <div className="flex flex-col gap-3">
            {activeLetters.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No letters waiting yet.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Write one to your future self.</p>
              </div>
            ) : (
              activeLetters.map((letter, i) => (
                <motion.div
                  key={letter.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs text-primary font-semibold">
                          {getDaysUntil(letter.deliverAt)} days until delivery
                        </p>
                      </div>
                      <p className="text-foreground text-sm leading-relaxed line-clamp-2">
                        {letter.content}
                      </p>
                      <p className="text-muted-foreground text-xs mt-2">
                        Opens {formatDate(letter.deliverAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(letter.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Past letters */}
        {view === "past" && (
          <div className="flex flex-col gap-3">
            {pastLetters.length === 0 ? (
              <div className="text-center py-12">
                <MailOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No delivered letters yet.</p>
              </div>
            ) : (
              pastLetters.map((letter, i) => (
                <motion.div
                  key={letter.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MailOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Written {formatDate(letter.createdAt)}
                        </p>
                      </div>
                      <p className="text-foreground text-sm leading-relaxed">
                        {getDisplayContent(letter.content)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(letter.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
