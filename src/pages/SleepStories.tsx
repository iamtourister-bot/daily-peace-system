import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Play, Pause, X, Moon } from "lucide-react";

interface Story {
  id: string;
  title: string;
  description: string;
  duration: string;
  emoji: string;
  color: string;
  url: string;
}

const STORIES: Story[] = [
  {
    id: "lavender",
    title: "The Old Lavender Farm",
    description: "A golden afternoon in the south of France. Let the scent of lavender carry you to sleep.",
    duration: "8 min",
    emoji: "🌿",
    color: "from-purple-900 to-violet-700",
    url: "/daily-peace-system/sleep well.MP3",
  },
  {
    id: "lighthouse",
    title: "The Lighthouse Keeper",
    description: "A quiet coast at night. The steady rhythm of waves and a turning light. Nothing is required of you.",
    duration: "6 min",
    emoji: "🌊",
    color: "from-blue-950 to-slate-700",
    url: "/daily-peace-system/lighthouse-keeper.mp3.wav",
  },
];

export default function SleepStories() {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const playStory = (story: Story) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(story.url);
    audio.onloadedmetadata = () => {
      setDuration(formatTime(audio.duration));
    };
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime("0:00");
    };

    audio.play();
    audioRef.current = audio;
    setActiveStory(story);
    setIsPlaying(true);

    intervalRef.current = window.setInterval(() => {
      if (audioRef.current) {
        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(pct || 0);
        setCurrentTime(formatTime(audioRef.current.currentTime));
      }
    }, 500);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const closeStory = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveStory(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 bg-background">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <h1 className="text-3xl font-serif tracking-tight">Sleep Stories</h1>
          <p className="text-muted-foreground mt-2">
            Let a calm voice carry you gently into sleep.
          </p>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl"
        >
          <p className="text-sm text-muted-foreground">
            🌙 Best with headphones. Dim your screen. Let go of the day.
          </p>
        </motion.div>

        {/* Story Cards */}
        <div className="flex flex-col gap-4 pb-32">
          {STORIES.map((story, i) => (
            <motion.button
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => playStory(story)}
              className="relative overflow-hidden rounded-3xl text-left w-full h-40 shadow-md"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${story.color}`} />
              <div className="relative p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-3xl">{story.emoji}</span>
                  <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full">
                    <Moon className="w-3 h-3 text-white/80" />
                    <span className="text-xs text-white/80">{story.duration}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-serif text-white mb-1">{story.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{story.description}</p>
                </div>
              </div>
            </motion.button>
          ))}

          {/* Coming Soon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-5 border border-dashed border-border rounded-3xl text-center"
          >
            <p className="text-muted-foreground text-sm">✨ More stories coming soon</p>
          </motion.div>
        </div>

        {/* Player */}
        <AnimatePresence>
          {activeStory && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 left-0 right-0 mx-auto max-w-[430px] px-4 z-50"
            >
              <div className={`bg-gradient-to-br ${activeStory.color} rounded-3xl p-5 shadow-2xl`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Now Playing</p>
                    <p className="text-white font-serif text-lg">{activeStory.title}</p>
                  </div>
                  <button
                    onClick={closeStory}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-white/20 rounded-full mb-2">
                  <div
                    className="h-1 bg-white rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/50 mb-4">
                  <span>{currentTime}</span>
                  <span>{duration}</span>
                </div>

                {/* Play/Pause */}
                <div className="flex justify-center">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    {isPlaying
                      ? <Pause className="w-6 h-6 text-white" />
                      : <Play className="w-6 h-6 text-white ml-1" />
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
