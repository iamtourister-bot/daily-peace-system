import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Volume2, VolumeX, X } from "lucide-react";

interface Sound {
  id: string;
  name: string;
  description: string;
  emoji: string;
  url: string;
  color: string;
}

const SOUNDS: Sound[] = [
  {
    id: "rain",
    name: "Gentle Rain",
    description: "Soft rainfall on a quiet evening",
    emoji: "🌧️",
    url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3",
    color: "from-slate-800 to-slate-600",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    description: "Slow waves rolling to shore",
    emoji: "🌊",
    url: "https://assets.mixkit.co/active_storage/sfx/2184/2184-preview.mp3",
    color: "from-blue-900 to-cyan-700",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Birds and wind through the trees",
    emoji: "🌿",
    url: "https://assets.mixkit.co/active_storage/sfx/2516/2516-preview.mp3",
    color: "from-green-900 to-emerald-700",
  },
  {
    id: "fire",
    name: "Fireplace",
    description: "A warm crackling fire",
    emoji: "🔥",
    url: "https://assets.mixkit.co/active_storage/sfx/1921/1921-preview.mp3",
    color: "from-orange-900 to-amber-700",
  },
  {
    id: "noise",
    name: "Brown Noise",
    description: "Deep hum that quiets the mind",
    emoji: "🎵",
    url: "https://assets.mixkit.co/active_storage/sfx/2517/2517-preview.mp3",
    color: "from-purple-900 to-violet-700",
  },
];

export default function CalmingRoom() {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = (sound: Sound) => {
    if (activeSound === sound.id) {
      // Stop if same sound tapped
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActiveSound(null);
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(true);
    setActiveSound(sound.id);

    const audio = new Audio(sound.url);
    audio.loop = true;
    audio.volume = volume;
    audio.oncanplaythrough = () => setIsLoading(false);
    audio.play();
    audioRef.current = audio;
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const activeData = SOUNDS.find(s => s.id === activeSound);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] px-6 py-12 bg-background">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <h1 className="text-3xl font-serif tracking-tight">The Calming Room</h1>
          <p className="text-muted-foreground mt-2">
            Pick a sound. Close your eyes. Just be here.
          </p>
        </motion.div>

        {/* Now playing */}
        <AnimatePresence>
          {activeData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-6 rounded-3xl p-5 bg-gradient-to-br ${activeData.color} text-white`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-70 mb-1">
                    Now Playing
                  </p>
                  <p className="text-xl font-serif">
                    {isLoading ? "Loading..." : activeData.name}
                  </p>
                  <p className="text-sm opacity-70 mt-0.5">{activeData.description}</p>
                </div>
                <span className="text-4xl">{activeData.emoji}</span>
              </div>

              {/* Volume slider */}
              <div className="flex items-center gap-3 mt-2">
                <VolumeX className="w-4 h-4 opacity-60" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolume}
                  className="flex-1 h-1.5 rounded-full accent-white cursor-pointer"
                />
                <Volume2 className="w-4 h-4 opacity-60" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sound cards */}
        <div className="flex flex-col gap-4 mt-8 pb-32">
          {SOUNDS.map((sound, i) => {
            const isActive = activeSound === sound.id;
            return (
              <motion.button
                key={sound.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => playSound(sound)}
                className={`relative overflow-hidden rounded-3xl p-5 text-left w-full transition-all duration-300 border ${
                  isActive
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:shadow-sm"
                }`}
              >
                {/* Active glow background */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`absolute inset-0 bg-gradient-to-br ${sound.color} opacity-10`}
                  />
                )}

                <div className="relative flex items-center gap-4">
                  {/* Emoji with pulse when active */}
                  <div className="relative">
                    <span className="text-3xl">{sound.emoji}</span>
                    {isActive && (
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full bg-primary/30"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground">
                      {sound.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{sound.description}</p>
                  </div>

                  {/* Playing indicator */}
                  {isActive && (
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="flex gap-0.5 items-end h-5"
                    >
                      {[1, 2, 3].map(b => (
                        <motion.div
                          key={b}
                          animate={{ height: [8, 16, 8] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            delay: b * 0.15,
                          }}
                          className="w-1 bg-primary rounded-full"
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom tip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground pb-6"
        >
          Tap a sound to play • Tap again to stop
        </motion.p>

      </div>
    </PageTransition>
  );
}
