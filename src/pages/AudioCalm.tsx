import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { X, Play, Pause, Volume2, ChevronLeft } from "lucide-react";
import { useAudioEngine, SoundId } from "@/hooks/useAudioEngine";

const SOUNDS: {
  id: SoundId;
  name: string;
  label: string;
  desc: string;
  science: string;
  bg: string;
  accent: string;
}[] = [
  {
    id: "rain",
    name: "Gentle Rain",
    label: "RAINFALL",
    desc: "Soft, rhythmic rainfall. Nature's white noise.",
    science: "Rain sounds mask distracting frequencies and lower cortisol — proven to reduce stress within minutes.",
    bg: "https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&auto=format&fit=crop&q=80",
    accent: "#7EAAA7",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    label: "OCEAN",
    desc: "Slow, powerful waves. Breathing with the sea.",
    science: "Ocean sounds slow brainwaves to alpha/theta states — the same relaxed focus of deep meditation.",
    bg: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=80",
    accent: "#5B8FA8",
  },
  {
    id: "forest",
    name: "Forest Birds",
    label: "FOREST",
    desc: "Wind through trees, birdsong in the distance.",
    science: "Natural soundscapes reduce nervous system activation and restore attention by engaging the brain's default mode network.",
    bg: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
    accent: "#5E8C61",
  },
  {
    id: "bowl",
    name: "Tibetan Bowl",
    label: "432 Hz",
    desc: "Ancient singing bowl. One note. Total presence.",
    science: "432 Hz resonance synchronizes brainwaves and has been used in healing traditions for thousands of years.",
    bg: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
    accent: "#C4956A",
  },
  {
    id: "noise",
    name: "White Noise",
    label: "FOCUS",
    desc: "Pure, consistent noise. The blank canvas for the mind.",
    science: "White noise creates a constant audio environment that helps the brain reach sustained attention and ignore intrusive thoughts.",
    bg: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format&fit=crop&q=80",
    accent: "#9B8EA8",
  },
];

function RainVisualizer({ playing }: { playing: boolean }) {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 bg-white/40 rounded-full"
          style={{
            height: 8 + Math.random() * 16,
            left: `${(i / 20) * 100}%`,
            top: "10%",
          }}
          animate={playing ? {
            y: [0, 220],
            opacity: [0, 0.6, 0],
          } : { opacity: 0 }}
          transition={{
            duration: 0.8 + Math.random() * 0.6,
            repeat: Infinity,
            delay: Math.random() * 1.5,
            ease: "linear",
          }}
        />
      ))}
      <motion.div
        animate={playing ? { scale: [1, 1.04, 1], opacity: [0.2, 0.35, 0.2] } : { opacity: 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-40 h-40 rounded-full border border-white/30 flex items-center justify-center"
      >
        <div className="w-24 h-24 rounded-full bg-white/10" />
      </motion.div>
    </div>
  );
}

function OceanVisualizer({ playing }: { playing: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="rounded-full bg-white/25"
          style={{ width: 200 - i * 28, height: 4 }}
          animate={playing ? {
            x: [-(i * 8), (i * 8), -(i * 8)],
            opacity: [0.3, 0.7, 0.3],
            scaleX: [0.95, 1.05, 0.95],
          } : { opacity: 0.1 }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function ForestVisualizer({ playing }: { playing: boolean }) {
  return (
    <div className="relative w-64 h-48 flex items-end justify-center">
      {[...Array(7)].map((_, i) => {
        const h = 60 + Math.sin(i * 0.9) * 40;
        return (
          <motion.div
            key={i}
            className="mx-1 rounded-t-full bg-white/20"
            style={{ width: 20, height: h }}
            animate={playing ? {
              scaleY: [1, 1.06, 0.97, 1],
              x: [0, i % 2 === 0 ? 3 : -3, 0],
            } : { scaleY: 1, opacity: 0.2 }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

function BowlVisualizer({ playing }: { playing: boolean }) {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {[1, 1.6, 2.2, 2.8].map((scale, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/20"
          style={{ width: 60 * scale, height: 60 * scale }}
          animate={playing ? {
            scale: [scale, scale * 1.15, scale],
            opacity: [0.5 - i * 0.1, 0.2 - i * 0.03, 0.5 - i * 0.1],
          } : { opacity: 0.1 }}
          transition={{
            duration: 10,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        animate={playing ? { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] } : { opacity: 0.3 }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/50"
      />
    </div>
  );
}

function NoiseVisualizer({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(32)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-white/40"
          animate={playing ? {
            height: [
              4 + Math.random() * 20,
              4 + Math.random() * 32,
              4 + Math.random() * 12,
            ],
            opacity: [0.3, 0.7, 0.4],
          } : { height: 4, opacity: 0.15 }}
          transition={{
            duration: 0.15 + Math.random() * 0.2,
            repeat: Infinity,
            delay: i * 0.01,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function getVisualizer(id: SoundId, isPlaying: boolean) {
  switch (id) {
    case "rain": return <RainVisualizer playing={isPlaying} />;
    case "ocean": return <OceanVisualizer playing={isPlaying} />;
    case "forest": return <ForestVisualizer playing={isPlaying} />;
    case "bowl": return <BowlVisualizer playing={isPlaying} />;
    case "noise": return <NoiseVisualizer playing={isPlaying} />;
  }
}

export default function AudioCalm() {
  const [selected, setSelected] = useState<SoundId | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [, setLocation] = useLocation();
  const { playing, play, stop, volume, setVolume, resumeCtx } = useAudioEngine();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSound = SOUNDS.find(s => s.id === selected);
  const isPlaying = playing === selected;

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSelect = async (id: SoundId) => {
    await resumeCtx();
    setSelected(id);
    setElapsed(0);
    setShowDetail(true);
    play(id);
  };

  const handleBack = () => {
    stop();
    setShowDetail(false);
    setSelected(null);
    setElapsed(0);
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      stop();
    } else if (selected) {
      await resumeCtx();
      setElapsed(0);
      play(selected);
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden bg-[#0e1115]">

        <AnimatePresence mode="wait">
          {!showDetail ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-h-[100dvh]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1518399681705-1c1a55e5e883?w=800&auto=format&fit=crop&q=80)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

              <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-16 pb-10">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Sound Bath</p>
                    <h1 className="text-3xl font-serif text-white">Choose your calm.</h1>
                  </div>
                  <button
                    onClick={() => setLocation("/")}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-3 flex-1">
                  {SOUNDS.map((sound, i) => (
                    <motion.button
                      key={sound.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => handleSelect(sound.id)}
                      className="relative overflow-hidden rounded-2xl text-left"
                      style={{ height: 80 }}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${sound.bg})` }}
                      />
                      <div className="absolute inset-0 bg-black/50" />
                      <div className="relative z-10 flex items-center justify-between px-5 h-full">
                        <div>
                          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">{sound.label}</p>
                          <p className="text-white font-semibold text-lg leading-tight">{sound.name}</p>
                          <p className="text-white/60 text-xs mt-0.5">{sound.desc}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-h-[100dvh]"
            >
              {currentSound && (
                <>
                  <motion.div
                    key={currentSound.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2 }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${currentSound.bg})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

                  <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-14 pb-10">
                    <div className="flex items-center justify-between mb-auto">
                      <button
                        onClick={handleBack}
                        className="flex items-center gap-1.5 text-white/60 hover:text-white"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm">All sounds</span>
                      </button>
                      <p className="text-white/50 text-sm font-mono">{formatTime(elapsed)}</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-10">
                      <div>{getVisualizer(currentSound.id, isPlaying)}</div>

                      <div className="text-center">
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">{currentSound.label}</p>
                        <h2 className="text-3xl font-serif text-white mb-1">{currentSound.name}</h2>
                        <p className="text-white/60 text-sm max-w-xs">{currentSound.desc}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-4 h-4 text-white/40 shrink-0" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="flex-1 accent-white h-1"
                        />
                      </div>

                      <button
                        onClick={handleTogglePlay}
                        className="w-full py-4 rounded-2xl font-semibold text-lg border border-white/30 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center gap-3 hover:bg-white/20 transition-colors"
                      >
                        {isPlaying ? (
                          <><Pause className="w-5 h-5" /> Pause</>
                        ) : (
                          <><Play className="w-5 h-5 ml-0.5" /> Resume</>
                        )}
                      </button>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">Why it works</p>
                        <p className="text-white/70 text-sm leading-relaxed">{currentSound.science}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
