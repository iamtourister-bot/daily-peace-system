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
  color: string;
}[] = [
  {
    id: "rain",
    name: "Gentle Rain",
    label: "RAINFALL",
    desc: "Soft, rhythmic rainfall. Nature's white noise.",
    science: "Rain sounds mask distracting frequencies and lower cortisol — proven to reduce stress within minutes.",
    color: "from-slate-900 to-blue-950",
  },
  {
    id: "thunder",
    name: "Rain & Thunder",
    label: "STORM",
    desc: "Heavy rain with distant rolling thunder.",
    science: "Storm sounds create a powerful sense of safety — the contrast between outer chaos and inner stillness.",
    color: "from-gray-950 to-slate-900",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    label: "OCEAN",
    desc: "Slow, powerful waves. Breathing with the sea.",
    science: "Ocean sounds slow brainwaves to alpha/theta states — the same relaxed focus of deep meditation.",
    color: "from-blue-950 to-cyan-950",
  },
  {
    id: "forest",
    name: "Forest Birds",
    label: "FOREST",
    desc: "Wind through trees, birdsong in the distance.",
    science: "Natural soundscapes reduce nervous system activation and restore attention.",
    color: "from-green-950 to-emerald-950",
  },
  {
    id: "bowl",
    name: "Tibetan Bowl",
    label: "432 Hz",
    desc: "Ancient singing bowl. One note. Total presence.",
    science: "432 Hz resonance synchronizes brainwaves — used in healing traditions for thousands of years.",
    color: "from-amber-950 to-yellow-950",
  },
  {
    id: "noise",
    name: "White Noise",
    label: "FOCUS",
    desc: "Pure, consistent noise. The blank canvas for the mind.",
    science: "White noise creates a constant audio environment that helps the brain reach sustained attention.",
    color: "from-zinc-900 to-neutral-950",
  },
  {
    id: "brown",
    name: "Brown Noise",
    label: "DEEP",
    desc: "Deeper, richer noise. Like standing near a waterfall.",
    science: "Brown noise has lower frequencies that many find more soothing than white noise for focus and sleep.",
    color: "from-stone-900 to-amber-950",
  },
  {
    id: "fire",
    name: "Fireplace",
    label: "WARMTH",
    desc: "Crackling fire. Warm, alive, hypnotic.",
    science: "Fire sounds trigger a primal sense of safety and warmth — shown to lower blood pressure and promote relaxation.",
    color: "from-red-950 to-orange-950",
  },
  {
    id: "autumn",
    name: "Autumn Wind",
    label: "AUTUMN",
    desc: "Rustling leaves, gentle gusts of wind.",
    science: "Seasonal nature sounds activate memories of calm and transition — helping the mind release the present moment.",
    color: "from-orange-950 to-amber-950",
  },
  {
    id: "wind",
    name: "Deep Wind",
    label: "HOWL",
    desc: "Open, sweeping wind across a vast space.",
    science: "Deep low-frequency wind sounds create a meditative drone effect that quiets mental chatter.",
    color: "from-indigo-950 to-slate-950",
  },
];

// ── CANVAS VISUALIZERS ──────────────────────────────────────────────

function RainCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropsRef = useRef<{ x: number; y: number; speed: number; length: number; opacity: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    dropsRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 4 + Math.random() * 6,
      length: 10 + Math.random() * 20,
      opacity: 0.2 + Math.random() * 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
        dropsRef.current.forEach(drop => {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(180, 210, 255, ${drop.opacity})`;
          ctx.lineWidth = 1;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 2, drop.y + drop.length);
          ctx.stroke();
          drop.y += drop.speed;
          if (drop.y > canvas.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * canvas.width;
          }
        });
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function ThunderCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropsRef = useRef<{ x: number; y: number; speed: number; length: number }[]>([]);
  const flashRef = useRef(0);
  const nextFlashRef = useRef(Math.random() * 5000 + 3000);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    dropsRef.current = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 6 + Math.random() * 8,
      length: 15 + Math.random() * 25,
    }));

    const drawLightning = (x: number, y: number, len: number, angle: number, depth: number) => {
      if (depth === 0 || len < 5) return;
      const endX = x + Math.cos(angle) * len;
      const endY = y + Math.sin(angle) * len;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 200, ${0.9 - depth * 0.15})`;
      ctx.lineWidth = depth * 0.8;
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      drawLightning(endX, endY, len * 0.7, angle + (Math.random() - 0.5) * 1.2, depth - 1);
      if (Math.random() > 0.6) {
        drawLightning(endX, endY, len * 0.5, angle + (Math.random() - 0.5) * 1.5, depth - 2);
      }
    };

    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (playing) {
        // Heavy rain
        dropsRef.current.forEach(drop => {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(150, 180, 220, 0.4)`;
          ctx.lineWidth = 1.5;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 3, drop.y + drop.length);
          ctx.stroke();
          drop.y += drop.speed;
          if (drop.y > canvas.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * canvas.width;
          }
        });

        // Lightning flash
        const elapsed = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;
        nextFlashRef.current -= elapsed;

        if (nextFlashRef.current <= 0) {
          flashRef.current = 8;
          nextFlashRef.current = Math.random() * 8000 + 4000;
        }

        if (flashRef.current > 0) {
          const alpha = flashRef.current / 8;
          ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.3})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (flashRef.current === 8) {
            const lx = canvas.width * 0.3 + Math.random() * canvas.width * 0.4;
            drawLightning(lx, 0, 80, Math.PI / 2 + (Math.random() - 0.5) * 0.5, 5);
          }
          flashRef.current--;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function OceanCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
        timeRef.current += 0.008;
        const t = timeRef.current;
        const w = canvas.width;
        const h = canvas.height;

        for (let i = 0; i < 5; i++) {
          const yBase = h * 0.4 + i * 30;
          const amp = 12 - i * 1.5;
          const speed = 0.8 - i * 0.1;
          const alpha = 0.15 - i * 0.02;

          ctx.beginPath();
          ctx.moveTo(0, yBase);
          for (let x = 0; x <= w; x += 4) {
            const y = yBase + Math.sin(x * 0.015 + t * speed) * amp + Math.sin(x * 0.008 + t * speed * 0.7) * (amp * 0.5);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fillStyle = `rgba(100, 180, 220, ${alpha})`;
          ctx.fill();
        }

        // Foam particles
        for (let i = 0; i < 3; i++) {
          const x = ((t * 30 * (i + 1)) % w);
          const yBase = h * 0.4 + i * 30;
          const y = yBase + Math.sin(x * 0.015 + t) * 12;
          ctx.beginPath();
          ctx.arc(x, y, 2 + i, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,0.3)`;
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function ForestCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const birdsRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    birdsRef.current = Array.from({ length: 6 }, () => ({
      x: Math.random() * canvas.width,
      y: 40 + Math.random() * 80,
      vx: 0.3 + Math.random() * 0.5,
      vy: 0,
      size: 2 + Math.random() * 2,
    }));

    const drawTree = (x: number, h: number, sway: number) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(60, 40, 20, 0.6)`;
      ctx.lineWidth = 3;
      ctx.moveTo(x, canvas.height);
      ctx.lineTo(x + sway * 5, canvas.height - h * 0.4);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const py = canvas.height - h * 0.3 - i * h * 0.2;
        const px = x + sway * (3 + i * 2);
        const size = (40 - i * 8) + Math.sin(sway) * 3;
        ctx.beginPath();
        ctx.ellipse(px, py, size, size * 1.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, ${80 + i * 20}, 30, 0.5)`;
        ctx.fill();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
        timeRef.current += 0.01;
        const t = timeRef.current;

        // Trees
        const treePositions = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
        treePositions.forEach((pos, i) => {
          const sway = Math.sin(t * 0.5 + i) * 0.8;
          drawTree(canvas.width * pos, 120 + (i % 3) * 30, sway);
        });

        // Light rays
        for (let i = 0; i < 3; i++) {
          const lx = canvas.width * (0.2 + i * 0.3);
          const grad = ctx.createLinearGradient(lx, 0, lx + 20, canvas.height * 0.6);
          grad.addColorStop(0, `rgba(255, 220, 100, ${0.03 + Math.sin(t + i) * 0.01})`);
          grad.addColorStop(1, "rgba(255, 220, 100, 0)");
          ctx.beginPath();
          ctx.moveTo(lx, 0);
          ctx.lineTo(lx + 40, canvas.height * 0.6);
          ctx.lineTo(lx - 10, canvas.height * 0.6);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Birds
        birdsRef.current.forEach(bird => {
          bird.x += bird.vx;
          bird.vy = Math.sin(timeRef.current * 2 + bird.x * 0.05) * 0.3;
          bird.y += bird.vy;
          if (bird.x > canvas.width + 20) bird.x = -20;

          ctx.beginPath();
          ctx.strokeStyle = `rgba(200, 200, 200, 0.6)`;
          ctx.lineWidth = 1.5;
          ctx.moveTo(bird.x - bird.size, bird.y);
          ctx.quadraticCurveTo(bird.x, bird.y - bird.size * 2, bird.x + bird.size, bird.y);
          ctx.stroke();
        });
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function FireCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const cols = Math.floor(W / 4);
    let fire = new Float32Array(cols * Math.floor(H / 4));
    const rows = Math.floor(H / 4);

    const draw = () => {
      if (playing) {
        // Seed bottom row
        for (let x = 0; x < cols; x++) {
          fire[(rows - 1) * cols + x] = Math.random() > 0.1 ? 1.0 : 0;
        }

        // Propagate upward
        for (let y = 0; y < rows - 1; y++) {
          for (let x = 0; x < cols; x++) {
            const below = fire[(y + 1) * cols + x];
            const bl = fire[(y + 1) * cols + Math.max(0, x - 1)];
            const br = fire[(y + 1) * cols + Math.min(cols - 1, x + 1)];
            fire[y * cols + x] = (below + bl + br) / 3.05;
          }
        }

        const imgData = ctx.createImageData(cols, rows);
        for (let i = 0; i < cols * rows; i++) {
          const v = fire[i];
          const r = Math.min(255, v * 500);
          const g = Math.min(255, v * 200);
          const b = Math.min(255, v * 50);
          imgData.data[i * 4] = r;
          imgData.data[i * 4 + 1] = g;
          imgData.data[i * 4 + 2] = b;
          imgData.data[i * 4 + 3] = v > 0.01 ? 255 : 0;
        }

        // Scale up
        const tmp = document.createElement("canvas");
        tmp.width = cols;
        tmp.height = rows;
        tmp.getContext("2d")!.putImageData(imgData, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(tmp, 0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
        fire = new Float32Array(cols * rows);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ imageRendering: "pixelated" }} />;
}

function AutumnCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const leavesRef = useRef<{ x: number; y: number; vx: number; vy: number; rotation: number; vr: number; size: number; color: string; wobble: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ["#c0392b", "#e67e22", "#f39c12", "#d35400", "#922b21", "#ca6f1e"];
    leavesRef.current = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0.5 + Math.random() * 1.5,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.05,
      size: 6 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      wobble: Math.random() * Math.PI * 2,
    }));

    const drawLeaf = (x: number, y: number, size: number, rotation: number, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(size * 0.8, -size * 0.5, size * 0.8, size * 0.5, 0, size);
      ctx.bezierCurveTo(-size * 0.8, size * 0.5, -size * 0.8, -size * 0.5, 0, -size);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
        leavesRef.current.forEach(leaf => {
          leaf.wobble += 0.02;
          leaf.x += leaf.vx + Math.sin(leaf.wobble) * 0.5;
          leaf.y += leaf.vy;
          leaf.rotation += leaf.vr;

          if (leaf.y > canvas.height + 20) {
            leaf.y = -20;
            leaf.x = Math.random() * canvas.width;
          }

          drawLeaf(leaf.x, leaf.y, leaf.size, leaf.rotation, leaf.color);
        });
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function BowlCanvas({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[1, 1.6, 2.2, 2.8, 3.4].map((scale, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-amber-400/20"
          style={{ width: 60 * scale, height: 60 * scale }}
          animate={playing ? {
            scale: [scale, scale * 1.12, scale],
            opacity: [0.4 - i * 0.06, 0.15, 0.4 - i * 0.06],
          } : { opacity: 0.05 }}
          transition={{ duration: 10, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
        />
      ))}
      <motion.div
        animate={playing ? { scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] } : { opacity: 0.2 }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="w-14 h-14 rounded-full bg-amber-400/30 border-2 border-amber-400/50"
      />
    </div>
  );
}

function NoiseCanvas({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-0.5">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-white/30"
            animate={playing ? {
              height: [4 + Math.random() * 20, 4 + Math.random() * 40, 4 + Math.random() * 15],
              opacity: [0.2, 0.6, 0.3],
            } : { height: 4, opacity: 0.1 }}
            transition={{
              duration: 0.1 + Math.random() * 0.15,
              repeat: Infinity,
              delay: i * 0.008,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BrownCanvas({ playing }: { playing: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-1">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 rounded-full bg-amber-800/50"
            animate={playing ? {
              height: [8 + Math.random() * 30, 8 + Math.random() * 60, 8 + Math.random() * 20],
              opacity: [0.3, 0.7, 0.4],
            } : { height: 8, opacity: 0.1 }}
            transition={{
              duration: 0.3 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function WindCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
        timeRef.current += 0.008;
        const t = timeRef.current;
        const w = canvas.width;
        const h = canvas.height;

        for (let i = 0; i < 8; i++) {
          const y = h * 0.2 + i * h * 0.08;
          const speed = 0.5 + i * 0.15;
          const amp = 8 + i * 3;
          const alpha = 0.06 - i * 0.005;
          const len = w * (0.4 + Math.sin(t * 0.3 + i) * 0.3);
          const startX = (t * speed * 50 + i * 100) % (w + 200) - 100;

          ctx.beginPath();
          ctx.moveTo(startX, y);
          for (let x = startX; x < startX + len; x += 3) {
            const yOff = Math.sin(x * 0.02 + t * speed) * amp;
            ctx.lineTo(x, y + yOff);
          }
          ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
          ctx.lineWidth = 1.5 + i * 0.3;
          ctx.stroke();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function getVisualizer(id: SoundId, isPlaying: boolean) {
  switch (id) {
    case "rain": return <RainCanvas playing={isPlaying} />;
    case "thunder": return <ThunderCanvas playing={isPlaying} />;
    case "ocean": return <OceanCanvas playing={isPlaying} />;
    case "forest": return <ForestCanvas playing={isPlaying} />;
    case "bowl": return <BowlCanvas playing={isPlaying} />;
    case "noise": return <NoiseCanvas playing={isPlaying} />;
    case "brown": return <BrownCanvas playing={isPlaying} />;
    case "fire": return <FireCanvas playing={isPlaying} />;
    case "autumn": return <AutumnCanvas playing={isPlaying} />;
    case "wind": return <WindCanvas playing={isPlaying} />;
  }
}

const POST_FEELINGS = [
  { label: "Calmer", emoji: "🌿" },
  { label: "Lighter", emoji: "☁️" },
  { label: "Still heavy", emoji: "💙" },
  { label: "Grateful", emoji: "💚" },
  { label: "Tired", emoji: "🌙" },
];

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
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden bg-[#0a0a0f]">
        <AnimatePresence mode="wait">
          {!showDetail ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-h-[100dvh]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black" />
              <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-16 pb-10">
                <div className="flex items-center justify-between mb-8">
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
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelect(sound.id)}
                      className={`relative overflow-hidden rounded-2xl text-left bg-gradient-to-r ${sound.color} border border-white/5`}
                      style={{ height: 72 }}
                    >
                      <div className="relative z-10 flex items-center justify-between px-5 h-full">
                        <div>
                          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">{sound.label}</p>
                          <p className="text-white font-semibold text-base leading-tight">{sound.name}</p>
                          <p className="text-white/50 text-xs mt-0.5">{sound.desc}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
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
                  <div className={`absolute inset-0 bg-gradient-to-b ${currentSound.color}`} />
                  <div className="absolute inset-0">{getVisualizer(currentSound.id, isPlaying)}</div>
                  <div className="absolute inset-0 bg-black/30" />

                  <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-14 pb-10">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleBack}
                        className="flex items-center gap-1.5 text-white/60 hover:text-white"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm">All sounds</span>
                      </button>
                      <p className="text-white/50 text-sm font-mono">{formatTime(elapsed)}</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">{currentSound.label}</p>
                        <h2 className="text-3xl font-serif text-white mb-1">{currentSound.name}</h2>
                        <p className="text-white/60 text-sm max-w-xs">{currentSound.desc}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
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
