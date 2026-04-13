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

// ── VISUALIZERS ─────────────────────────────────────────────────────────────

function RainCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const state = useRef<{ drops: any[]; splashes: any[] }>({ drops: [], splashes: [] });

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;

    function mkDrop() {
      const spd = 9 + Math.random() * 11;
      return { x: Math.random() * (W + 100) - 50, y: -20 - Math.random() * H * 0.6, vx: spd * 0.18, vy: spd, thick: 0.5 + Math.random() * 0.9, alpha: 0.2 + Math.random() * 0.5, trail: [] as { x: number; y: number }[] };
    }
    function splash(x: number, y: number) {
      for (let i = 0; i < 4 + Math.random() * 5; i++) {
        const a = -Math.PI + Math.random() * Math.PI, s = 1 + Math.random() * 3;
        state.current.splashes.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 1, dec: 0.07 + Math.random() * 0.06, r: 0.4 + Math.random() * 1.2 });
      }
      state.current.splashes.push({ rip: true, x, y, r: 0, life: 1 });
    }

    const { drops, splashes } = state.current;
    drops.length = 0; splashes.length = 0;
    for (let i = 0; i < 220; i++) { const d = mkDrop(); d.y = Math.random() * H; drops.push(d); }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        drops.forEach(d => {
          d.vy += 0.025; d.x += d.vx; d.y += d.vy;
          d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 5) d.trail.shift();
          if (d.y > H + 5) { if (Math.random() < 0.55) splash(d.x, H - 3); Object.assign(d, mkDrop()); }
          if (d.trail.length > 1) {
            ctx.beginPath(); ctx.moveTo(d.trail[0].x, d.trail[0].y);
            d.trail.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(d.x + d.vx * 0.5, d.y + d.vy * 0.5);
            ctx.strokeStyle = `rgba(175,212,255,${d.alpha})`; ctx.lineWidth = d.thick; ctx.lineCap = "round"; ctx.stroke();
          }
        });
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          if (s.rip) {
            s.r += 0.9; s.life -= 0.055;
            if (s.life <= 0) { splashes.splice(i, 1); continue; }
            ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.28, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(175,212,255,${s.life * 0.28})`; ctx.lineWidth = 0.7; ctx.stroke();
          } else {
            s.vy += 0.18; s.x += s.vx; s.y += s.vy; s.life -= s.dec;
            if (s.life <= 0 || s.y > H + 5) { splashes.splice(i, 1); continue; }
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,228,255,${s.life * 0.55})`; ctx.fill();
          }
        }
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

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const drops: any[] = [];
    let flash = 0, nextFlash = 6000, lt = 0, boltX = W / 2;

    function mkDrop() {
      const s = 8 + Math.random() * 12;
      return { x: Math.random() * (W + 100) - 50, y: -20, vx: s * 0.22, vy: s, alpha: 0.3 + Math.random() * 0.45, trail: [] as any[] };
    }
    for (let i = 0; i < 200; i++) { const d = mkDrop(); d.y = Math.random() * H; drops.push(d); }

    function bolt(x: number, y: number, len: number, angle: number, depth: number) {
      if (depth < 1 || len < 4) return;
      const ex = x + Math.cos(angle) * len, ey = y + Math.sin(angle) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(220,230,255,${0.85 - depth * 0.12})`; ctx.lineWidth = depth * 0.7; ctx.stroke();
      bolt(ex, ey, len * 0.68, angle + (Math.random() - 0.5) * 1.1, depth - 1);
      if (Math.random() > 0.55) bolt(ex, ey, len * 0.45, angle + (Math.random() - 0.5) * 1.4, depth - 2);
    }

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        drops.forEach(d => {
          d.vy += 0.03; d.x += d.vx; d.y += d.vy;
          d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 4) d.trail.shift();
          if (d.y > H + 5) Object.assign(d, mkDrop());
          if (d.trail.length > 1) {
            ctx.beginPath(); ctx.moveTo(d.trail[0].x, d.trail[0].y);
            d.trail.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = `rgba(160,195,240,${d.alpha})`; ctx.lineWidth = 0.8; ctx.lineCap = "round"; ctx.stroke();
          }
        });
        const dt = lt ? ts - lt : 16; lt = ts;
        nextFlash -= dt;
        if (nextFlash <= 0) { flash = 10; nextFlash = 7000 + Math.random() * 10000; boltX = W * 0.25 + Math.random() * W * 0.5; }
        if (flash > 0) {
          ctx.fillStyle = `rgba(210,225,255,${(flash / 10) * 0.25})`; ctx.fillRect(0, 0, W, H);
          if (flash === 10) bolt(boltX, 0, H * 0.45, Math.PI / 2 + (Math.random() - 0.5) * 0.4, 6);
          flash--;
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

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    let t = 0;

    const foam: { x: number; y: number; vx: number; vy: number; life: number; r: number }[] = [];
    for (let i = 0; i < 35; i++) {
      foam.push({ x: Math.random() * W, y: H * 0.45 + Math.random() * H * 0.2, vx: (Math.random() - 0.5) * 0.4, vy: -Math.random() * 0.2, life: Math.random(), r: 0.8 + Math.random() * 2 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.006;
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
        skyGrad.addColorStop(0, "#04080f"); skyGrad.addColorStop(0.5, "#060d1a"); skyGrad.addColorStop(1, "#0a1628");
        ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H * 0.42);

        for (let i = 0; i < 60; i++) {
          const sx = ((i * 131.7) % W), sy = ((i * 73.1) % (H * 0.38));
          const tw = 0.2 + 0.6 * Math.abs(Math.sin(t * 0.5 + i * 0.7));
          ctx.beginPath(); ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,240,${tw})`; ctx.fill();
        }

        const moonX = W * 0.75, moonY = H * 0.12;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 5, moonX, moonY, 45);
        moonGlow.addColorStop(0, "rgba(255,245,200,0.12)"); moonGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = moonGlow; ctx.beginPath(); ctx.arc(moonX, moonY, 45, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,248,210,0.92)"; ctx.fill();

        for (let row = 0; row < 18; row++) {
          const ry = H * 0.42 + row * (H * 0.58 / 18);
          const rw = 12 + row * 3 + Math.sin(t * 2 + row) * 4;
          const rx = moonX + Math.sin(t * 1.5 + row * 0.4) * (row * 1.5);
          ctx.fillStyle = `rgba(255,248,200,${0.08 - row * 0.004})`;
          ctx.beginPath(); ctx.ellipse(rx, ry, rw, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        }

        const horizGrad = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.48);
        horizGrad.addColorStop(0, "rgba(20,50,100,0.5)"); horizGrad.addColorStop(1, "rgba(10,30,70,0)");
        ctx.fillStyle = horizGrad; ctx.fillRect(0, H * 0.38, W, H * 0.1);

        const waterGrad = ctx.createLinearGradient(0, H * 0.42, 0, H);
        waterGrad.addColorStop(0, "#0a2040"); waterGrad.addColorStop(0.3, "#071830"); waterGrad.addColorStop(1, "#040f1e");
        ctx.fillStyle = waterGrad; ctx.fillRect(0, H * 0.42, W, H * 0.58);

        const layers = [
          { yF: 0.42, amp: 14, fq: 0.012, spd: 1.0, colR: 25, colG: 80, colB: 140, a: 0.55 },
          { yF: 0.52, amp: 9, fq: 0.016, spd: 0.72, colR: 18, colG: 65, colB: 120, a: 0.45 },
          { yF: 0.61, amp: 6, fq: 0.021, spd: 0.52, colR: 12, colG: 50, colB: 100, a: 0.35 },
          { yF: 0.70, amp: 4, fq: 0.027, spd: 0.38, colR: 8, colG: 38, colB: 80, a: 0.25 },
          { yF: 0.78, amp: 2, fq: 0.034, spd: 0.22, colR: 5, colG: 28, colB: 60, a: 0.18 },
        ];

        layers.forEach((l, li) => {
          const yBase = H * l.yF;
          ctx.beginPath(); ctx.moveTo(0, yBase);
          for (let x = 0; x <= W; x += 3) {
            const y = yBase + Math.sin(x * l.fq + t * l.spd) * l.amp + Math.sin(x * l.fq * 0.6 + t * l.spd * 0.65 + li) * l.amp * 0.5 + Math.sin(x * l.fq * 1.9 + t * l.spd * 1.5) * l.amp * 0.18;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
          const wg = ctx.createLinearGradient(0, yBase - l.amp, 0, yBase + 20);
          wg.addColorStop(0, `rgba(${l.colR + 20},${l.colG + 30},${l.colB + 40},${l.a})`);
          wg.addColorStop(1, `rgba(${l.colR},${l.colG},${l.colB},${l.a * 0.4})`);
          ctx.fillStyle = wg; ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, yBase);
          for (let x = 0; x <= W; x += 3) {
            const y = yBase + Math.sin(x * l.fq + t * l.spd) * l.amp + Math.sin(x * l.fq * 0.6 + t * l.spd * 0.65 + li) * l.amp * 0.5 + Math.sin(x * l.fq * 1.9 + t * l.spd * 1.5) * l.amp * 0.18;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(255,255,255,${li === 0 ? 0.18 : 0.08})`; ctx.lineWidth = li === 0 ? 1.2 : 0.6; ctx.stroke();
        });

        foam.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.life -= 0.005;
          if (p.life <= 0) { p.x = Math.random() * W; p.y = H * (0.42 + Math.random() * 0.2); p.vx = (Math.random() - 0.5) * 0.4; p.vy = -Math.random() * 0.2; p.life = 0.7 + Math.random() * 0.3; }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.life * 0.35})`; ctx.fill();
        });
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

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    let t = 0;
    const birds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 20 + Math.random() * 60, vx: 0.4 + Math.random() * 0.5, sz: 1.5 + Math.random() * 1.5 }));
    const trees = [{ x: 0.08, h: 110, w: 28 }, { x: 0.2, h: 140, w: 35 }, { x: 0.35, h: 120, w: 30 }, { x: 0.5, h: 150, w: 38 }, { x: 0.65, h: 125, w: 32 }, { x: 0.79, h: 138, w: 36 }, { x: 0.93, h: 108, w: 27 }];

    function drawTree(x: number, h: number, w: number, sw: number) {
      ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + sw * 3, H - h * 0.4, x + sw * 5, H - h * 0.45);
      ctx.strokeStyle = "rgba(40,25,10,.7)"; ctx.lineWidth = 3; ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const ty = H - h * 0.28 - i * h * 0.22, tx = x + sw * (3 + i * 2.5);
        const rx = w * 0.55 - i * 3, ry = (w * 0.75 - i * 2) * (1 + Math.sin(t * 0.4 + i) * 0.03);
        ctx.beginPath(); ctx.ellipse(tx, ty, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${15 + i * 8},${55 + i * 18},${12 + i * 8},.55)`; ctx.fill();
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.01;
        for (let i = 0; i < 3; i++) {
          const lx = W * (0.18 + i * 0.32);
          const grad = ctx.createLinearGradient(lx, 0, lx + 15, H * 0.65);
          grad.addColorStop(0, `rgba(255,215,80,${0.025 + Math.sin(t + i) * 0.008})`);
          grad.addColorStop(1, "rgba(255,215,80,0)");
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + 30, H * 0.65); ctx.lineTo(lx - 5, H * 0.65); ctx.closePath();
          ctx.fillStyle = grad; ctx.fill();
        }
        trees.forEach(tr => { const sw = Math.sin(t * 0.45 + tr.x * 10) * 0.7; drawTree(tr.x * W, tr.h, tr.w, sw); });
        birds.forEach(b => {
          b.x += b.vx; if (b.x > W + 15) b.x = -15;
          const flap = Math.sin(t * 8 + b.x * 0.1) * b.sz;
          ctx.beginPath(); ctx.moveTo(b.x - b.sz * 1.5, b.y + flap);
          ctx.quadraticCurveTo(b.x, b.y - b.sz * 1.5, b.x + b.sz * 1.5, b.y + flap);
          ctx.strokeStyle = "rgba(210,210,200,.65)"; ctx.lineWidth = 1.2; ctx.stroke();
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

    const particles: { x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number }[] = [];

    const spawnParticle = () => ({
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: H * 0.75,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(1.5 + Math.random() * 2.5),
      life: 1,
      size: 18 + Math.random() * 28,
      hue: 20 + Math.random() * 30,
    });

    for (let i = 0; i < 60; i++) {
      const p = spawnParticle();
      p.y = H * 0.4 + Math.random() * H * 0.4;
      p.life = Math.random();
      particles.push(p);
    }

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.03;

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#050805");
        bg.addColorStop(1, "#0a0e07");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 50; i++) {
          const sx = (i * 137.5) % W;
          const sy = (i * 79.3) % (H * 0.45);
          const tw = 0.2 + 0.6 * Math.abs(Math.sin(t * 0.4 + i));
          ctx.beginPath();
          ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,220,${tw})`;
          ctx.fill();
        }

        const glow = ctx.createRadialGradient(W / 2, H * 0.75, 0, W / 2, H * 0.75, W * 0.7);
        glow.addColorStop(0, `rgba(255,100,10,${0.15 + Math.sin(t * 1.1) * 0.03})`);
        glow.addColorStop(0.4, "rgba(200,60,0,0.06)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        [[0.05, 130], [0.18, 160], [0.35, 145], [0.65, 148], [0.82, 155], [0.95, 125]].forEach(([xf, h]: any) => {
          const tx = xf * W;
          ctx.beginPath();
          ctx.moveTo(tx, H);
          ctx.lineTo(tx - 15, H - h * 0.45);
          ctx.lineTo(tx, H - h);
          ctx.lineTo(tx + 15, H - h * 0.45);
          ctx.closePath();
          ctx.fillStyle = "rgba(4,8,4,0.9)";
          ctx.fill();
        });

        ctx.fillStyle = "#0d0b06";
        ctx.fillRect(0, H * 0.78, W, H * 0.22);

        const drawLog = (lx: number, ly: number, angle: number) => {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(angle);
          const lg = ctx.createLinearGradient(0, -7, 0, 7);
          lg.addColorStop(0, "#5a3010");
          lg.addColorStop(0.5, "#3a1e08");
          lg.addColorStop(1, "#1a0a03");
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.ellipse(0, 0, 48, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(48, 0, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,70,5,${0.5 + Math.sin(t * 2) * 0.2})`;
          ctx.fill();
          ctx.restore();
        };
        drawLog(W / 2 - 8, H * 0.77, -0.32);
        drawLog(W / 2 + 8, H * 0.775, 0.35);

        particles.forEach(p => {
          p.x += p.vx + Math.sin(t * 2 + p.y * 0.02) * 0.4;
          p.y += p.vy;
          p.vy -= 0.02;
          p.life -= 0.012;
          p.size *= 0.993;
          if (p.life <= 0 || p.y < H * 0.1) {
            Object.assign(p, spawnParticle());
            return;
          }
          const a = p.life * 0.9;
          const g = Math.floor(Math.min(255, p.hue * 3 * p.life));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(255,${g},0,${a})`);
          grad.addColorStop(0.4, `rgba(255,${Math.floor(g * 0.6)},0,${a * 0.6})`);
          grad.addColorStop(1, "rgba(255,20,0,0)");
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });

        for (let i = 0; i < 3; i++) {
          const ex = W / 2 + Math.sin(t * 2.1 + i * 2) * 35;
          const ey = H * 0.75 - ((t * 25 * (i + 1)) % (H * 0.6));
          const ea = Math.max(0, 1 - (H * 0.75 - ey) / (H * 0.6));
          ctx.beginPath();
          ctx.arc(ex, ey, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,180,50,${ea * 0.8})`;
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return (
    <div className="absolute inset-0" style={{ filter: playing ? "blur(8px) contrast(18)" : "none" }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

function BowlCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const RINGS = 7;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.012;
        for (let i = 0; i < RINGS; i++) {
          const phase = t - i * 0.28;
          const r = Math.max(1, 12 + i * 16 + Math.sin(phase) * 4);
          const alpha = (0.55 - i * 0.065) * (0.5 + 0.5 * Math.sin(phase + Math.PI * 0.5));
          const g = 255 - Math.floor(i * 20);
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${g},${Math.floor(g * 0.75)},${Math.floor(g * 0.2)},${alpha})`;
          ctx.lineWidth = 1.5 - i * 0.12; ctx.stroke();
        }
        const inner = 8 + Math.sin(t) * 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,210,80,${0.4 + Math.sin(t) * 0.15})`; ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function NoiseCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const BUF = 180; const history = new Float32Array(BUF); let head = 0; let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.04;
        const val = (Math.random() * 2 - 1) * 0.85 + Math.sin(t * 7.3) * Math.random() * 0.3;
        history[head % BUF] = val; head++;
        ctx.beginPath();
        for (let i = 0; i < BUF; i++) {
          const idx = (head - BUF + i + BUF * 10) % BUF;
          const x = (i / BUF) * W, y = H / 2 + history[idx] * (H * 0.38);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(180,200,255,.65)"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
        ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function BrownCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const BUF = 180; const history = new Float32Array(BUF); let head = 0, lastOut = 0, t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.025;
        const w = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * w) / 1.02;
        history[head % BUF] = Math.max(-1, Math.min(1, lastOut * 3.5)); head++;
        ctx.beginPath();
        for (let i = 0; i < BUF; i++) {
          const idx = (head - BUF + i + BUF * 10) % BUF;
          const x = (i / BUF) * W, y = H / 2 + history[idx] * (H * 0.42);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "rgba(160,90,20,0)"); grad.addColorStop(0.5, "rgba(180,105,25,.7)"); grad.addColorStop(1, "rgba(160,90,20,0)");
        ctx.strokeStyle = grad; ctx.lineWidth = 2.2; ctx.stroke();
        for (let l = 0; l < 3; l++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 4) {
            const y = H / 2 + Math.sin(x * 0.008 + l * 0.7 + t * (l + 1) * 0.4) * (H * 0.12 + l * 8);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(140,80,15,${0.12 - l * 0.03})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function AutumnCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const COLORS = ["#c0392b", "#e67e22", "#f0a500", "#d35400", "#a93226", "#ca6f1e", "#e74c3c"];
    const leaves = Array.from({ length: 38 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 1.2, vy: 0.6 + Math.random() * 1.4,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.04,
      sz: 5 + Math.random() * 9, col: COLORS[Math.floor(Math.random() * COLORS.length)],
      wob: Math.random() * Math.PI * 2, wobSpd: 0.015 + Math.random() * 0.02,
    }));

    function drawLeaf(x: number, y: number, sz: number, rot: number, col: string) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.bezierCurveTo(sz * 0.9, -sz * 0.55, sz * 0.85, sz * 0.45, 0, sz);
      ctx.bezierCurveTo(-sz * 0.85, sz * 0.45, -sz * 0.9, -sz * 0.55, 0, -sz);
      ctx.fillStyle = col; ctx.globalAlpha = 0.75; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(0, sz);
      ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.5; ctx.stroke();
      ctx.restore();
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        leaves.forEach(l => {
          l.wob += l.wobSpd; l.x += l.vx + Math.sin(l.wob) * 0.55; l.y += l.vy; l.rot += l.vr;
          if (l.y > H + 15) { l.y = -15; l.x = Math.random() * W; }
          if (l.x < -15 || l.x > W + 15) { l.x = Math.random() * W; l.y = -15; }
          drawLeaf(l.x, l.y, l.sz, l.rot, l.col);
        });
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function WindCanvas({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    let t = 0;
    const dust = Array.from({ length: 55 }, () => ({ x: Math.random() * W, y: Math.random() * H, spd: 1.5 + Math.random() * 4, alpha: 0.12 + Math.random() * 0.3, r: 0.5 + Math.random() * 1.5 }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (playing) {
        t += 0.007;
        for (let i = 0; i < 9; i++) {
          const y = H * (0.08 + i * 0.1);
          const spd = 0.4 + i * 0.12, amp = 5 + i * 2.5, alpha = 0.055 - i * 0.004;
          const len = W * (0.35 + Math.sin(t * 0.25 + i) * 0.3);
          const sx = ((t * spd * 55 + i * 120) % (W + 250)) - 100;
          ctx.beginPath(); ctx.moveTo(sx, y);
          for (let x = sx; x < sx + len; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.018 + t * spd) * amp);
          ctx.strokeStyle = `rgba(195,215,255,${alpha})`; ctx.lineWidth = 1 + i * 0.2; ctx.stroke();
        }
        dust.forEach(d => {
          d.x += d.spd;
          if (d.x > W + 5) { d.x = -5; d.y = Math.random() * H; }
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,225,255,${d.alpha})`; ctx.fill();
        });
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
            <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col min-h-[100dvh]">
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black" />
              <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-16 pb-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Sound Bath</p>
                    <h1 className="text-3xl font-serif text-white">Choose your calm.</h1>
                  </div>
                  <button onClick={() => setLocation("/")} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {SOUNDS.map((sound, i) => (
                    <motion.button key={sound.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelect(sound.id)}
                      className={`relative overflow-hidden rounded-2xl text-left bg-gradient-to-r ${sound.color} border border-white/5`}
                      style={{ height: 72 }}>
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
            <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col min-h-[100dvh]">
              {currentSound && (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-b ${currentSound.color}`} />
                  <div className="absolute inset-0">{getVisualizer(currentSound.id, isPlaying)}</div>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-14 pb-10">
                    <div className="flex items-center justify-between">
                      <button onClick={handleBack} className="flex items-center gap-1.5 text-white/60 hover:text-white">
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
                        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="flex-1 accent-white h-1" />
                      </div>
                      <button onClick={handleTogglePlay} className="w-full py-4 rounded-2xl font-semibold text-lg border border-white/30 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center gap-3 hover:bg-white/20 transition-colors">
                        {isPlaying ? (<><Pause className="w-5 h-5" /> Pause</>) : (<><Play className="w-5 h-5 ml-0.5" /> Resume</>)}
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
