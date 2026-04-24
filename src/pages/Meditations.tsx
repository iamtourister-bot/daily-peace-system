import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Play, Pause, X, ArrowLeft, Volume2, Wind, Waves, Moon, Sun, Leaf, Mountain, Droplets, Flame, Snowflake, Star } from "lucide-react";

// ── Google Font ────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap";
document.head.appendChild(fontLink);

const style = document.createElement("style");
style.textContent = `
  .med-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
  .med-sans  { font-family: 'DM Sans', system-ui, sans-serif; }
  .med-btn-play {
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 1.5px solid rgba(255,255,255,0.35);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.2s;
    backdrop-filter: blur(8px);
  }
  .med-btn-play:hover { background: rgba(255,255,255,0.25); }
  .med-btn-play:active { transform: scale(0.96); }
  .med-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 99px;
    background: rgba(255,255,255,0.12);
    border: 0.5px solid rgba(255,255,255,0.2);
    font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
    color: rgba(255,255,255,0.65);
  }
  .med-card {
    position: relative; border-radius: 20px; overflow: hidden;
    height: 160px; cursor: pointer; transition: transform 0.2s;
  }
  .med-card:active { transform: scale(0.98); }
  .med-progress-ring { transform: rotate(-90deg); }
  .nature-chip {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 99px; cursor: pointer;
    border: 1px solid rgba(255,255,255,0.18); font-size: 12px;
    color: rgba(255,255,255,0.7); transition: all 0.2s;
    backdrop-filter: blur(6px);
  }
  .nature-chip.active, .nature-chip:hover {
    background: rgba(255,255,255,0.18); color: rgba(255,255,255,1);
    border-color: rgba(255,255,255,0.4);
  }
`;
document.head.appendChild(style);

// ── CANVAS VISUALIZERS ─────────────────────────────────────────────────────
function RisingParticles({ color = "255,200,80" }) {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: H + Math.random() * H,
      r: 0.5 + Math.random() * 2, speed: 0.3 + Math.random() * 0.7,
      alpha: 0.08 + Math.random() * 0.4, drift: (Math.random() - 0.5) * 0.3,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.y -= p.speed; p.x += p.drift;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${p.alpha})`; ctx.fill();
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function RippleWaves({ color = "100,180,255" }) {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    const rings = Array.from({ length: 6 }, (_, i) => ({ r: i * 55, speed: 0.35 }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      rings.forEach(ring => {
        ring.r += ring.speed;
        if (ring.r > Math.max(W, H)) ring.r = 0;
        const alpha = Math.max(0, 0.28 * (1 - ring.r / Math.max(W, H)));
        ctx.beginPath(); ctx.arc(W / 2, H / 2, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color},${alpha})`; ctx.lineWidth = 1.5; ctx.stroke();
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function FallingParticles() {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    const pts = Array.from({ length: 45 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.5 + Math.random() * 1.8, speed: 0.12 + Math.random() * 0.35,
      alpha: 0.08 + Math.random() * 0.35, drift: (Math.random() - 0.5) * 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.y += p.speed; p.x += p.drift;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,225,255,${p.alpha})`; ctx.fill();
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function PulseRings({ color = "180,140,255" }) {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); t += 0.01;
      for (let i = 0; i < 5; i++) {
        const phase = t + i * (Math.PI / 2.5);
        const r = 25 + Math.abs(Math.sin(phase)) * 130;
        const alpha = 0.22 * Math.abs(Math.sin(phase));
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color},${alpha})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function AuroraShift() {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); t += 0.004;
      [
        [`rgba(60,100,220,${0.10 + Math.sin(t) * 0.05})`, 0.2],
        [`rgba(80,190,160,${0.09 + Math.sin(t + 1.2) * 0.04})`, 0.5],
        [`rgba(160,70,190,${0.07 + Math.sin(t + 2.4) * 0.03})`, 0.8],
      ].forEach(([color, xRatio]) => {
        const x = W * (xRatio + Math.sin(t + xRatio) * 0.08);
        const grad = ctx.createRadialGradient(x, H * 0.35, 0, x, H * 0.35, H * 0.65);
        grad.addColorStop(0, color); grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function EmberDrift() {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: H + Math.random() * H,
      r: 0.8 + Math.random() * 1.8, speed: 0.2 + Math.random() * 0.5,
      alpha: 0.1 + Math.random() * 0.5, drift: (Math.random() - 0.5) * 0.6,
      flicker: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); t += 0.03;
      pts.forEach(p => {
        p.y -= p.speed; p.x += p.drift + Math.sin(t + p.flicker) * 0.3;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        const a = p.alpha * (0.7 + 0.3 * Math.sin(t + p.flicker));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,160,60,${a})`; ctx.fill();
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function SnowDrift() {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.4 + Math.random() * 2, speed: 0.08 + Math.random() * 0.25,
      alpha: 0.15 + Math.random() * 0.5, drift: (Math.random() - 0.5) * 0.12,
      wobble: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); t += 0.012;
      pts.forEach(p => {
        p.y += p.speed; p.x += p.drift + Math.sin(t + p.wobble) * 0.1;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,235,255,${p.alpha})`; ctx.fill();
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function StarField() {
  const ref = useRef(null); const anim = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.3 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2, speed: 0.008 + Math.random() * 0.015,
    }));
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); t += 0.015;
      stars.forEach(s => {
        const alpha = 0.15 + 0.3 * Math.abs(Math.sin(t * s.speed * 60 + s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,215,255,${alpha})`; ctx.fill();
      });
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(anim.current);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

function getVisualizer(id) {
  const map = {
    morning: <RisingParticles color="255,210,100" />,
    anxiety: <RippleWaves color="120,180,255" />,
    sleep: <FallingParticles />,
    body: <PulseRings color="180,140,255" />,
    peace: <AuroraShift />,
    fire: <EmberDrift />,
    winter: <SnowDrift />,
    night: <StarField />,
  };
  return map[id] ?? <AuroraShift />;
}

// ── NATURE IMAGES ─────────────────────────────────────────────────────────
const NATURE = {
  sunrise:  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&auto=format&fit=crop&q=80",
  ocean:    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=900&auto=format&fit=crop&q=80",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&auto=format&fit=crop&q=80",
  meadow:   "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=900&auto=format&fit=crop&q=80",
  forest:   "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&auto=format&fit=crop&q=80",
  jungle:   "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=900&auto=format&fit=crop&q=80",
  lake:     "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=900&auto=format&fit=crop&q=80",
  waterfall:"https://images.unsplash.com/photo-1546587348-d12660c30c50?w=900&auto=format&fit=crop&q=80",
  canyon:   "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=900&auto=format&fit=crop&q=80",
  desert:   "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&auto=format&fit=crop&q=80",
  aurora:   "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=900&auto=format&fit=crop&q=80",
  blossom:  "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=900&auto=format&fit=crop&q=80",
  snow:     "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=900&auto=format&fit=crop&q=80",
  night:    "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=900&auto=format&fit=crop&q=80",
};

// ── Nature background switcher chips ──────────────────────────────────────
const NATURE_OPTIONS = [
  { key: "aurora",   label: "Aurora",    icon: Star },
  { key: "ocean",    label: "Ocean",     icon: Waves },
  { key: "forest",   label: "Forest",    icon: Leaf },
  { key: "mountain", label: "Mountain",  icon: Mountain },
  { key: "waterfall",label: "Waterfall", icon: Droplets },
  { key: "desert",   label: "Desert",    icon: Sun },
  { key: "snow",     label: "Snow",      icon: Snowflake },
  { key: "blossom",  label: "Blossom",   icon: Wind },
  { key: "lake",     label: "Lake",      icon: Waves },
  { key: "night",    label: "Night Sky", icon: Star },
  { key: "canyon",   label: "Canyon",    icon: Flame },
  { key: "jungle",   label: "Jungle",    icon: Leaf },
];

// ── MEDITATIONS ───────────────────────────────────────────────────────────
const MEDITATIONS = [
  {
    id: "morning", title: "Morning Clarity", subtitle: "Start with intention",
    image: NATURE.sunrise, tag: "Morning", tagIcon: Sun,
    intro: "A gentle way to open the day. Let the night release from your body.",
    audioUrl: "/daily-peace-system/morning-clarity.MP3",
    steps: [
      { text: "Get comfortable. Clear your mind and follow each instruction as it appears.", duration: 5000 },
      { text: "Take a slow breath in… and let it go.", duration: 10000 },
      { text: "Notice your body. Just observe.", duration: 12000 },
      { text: "Think of one thing you are stepping into today.", duration: 12000 },
      { text: "How do you want to move through this day?", duration: 14000 },
      { text: "Breathe in: I am present. Breathe out: I am ready.", duration: 14000 },
      { text: "Carry this stillness into your morning.", duration: 12000 },
    ]
  },
  {
    id: "anxiety", title: "Anxiety Relief", subtitle: "Quiet the storm inside",
    image: NATURE.ocean, tag: "Anxiety", tagIcon: Waves,
    intro: "When your mind is racing, this session helps you return to your body.",
    audioUrl: "/daily-peace-system/anxiety-relief.MP3",
    steps: [
      { text: "Get comfortable. Clear your mind and follow each instruction as it appears.", duration: 5000 },
      { text: "Place both feet on the floor. Feel the ground holding you.", duration: 12000 },
      { text: "Place one hand on your chest. Feel it rise and fall.", duration: 12000 },
      { text: "Breathe in for 4… hold for 2… out for 6.", duration: 16000 },
      { text: "Your thoughts are not facts. They pass like weather.", duration: 14000 },
      { text: "Name three things you can feel right now.", duration: 16000 },
      { text: "The feeling is not permanent. You are descending from it.", duration: 14000 },
      { text: "Just one more breath. You are here. You are safe.", duration: 14000 },
    ]
  },
  {
    id: "sleep", title: "Sleep Preparation", subtitle: "Let the day dissolve",
    image: NATURE.mountain, tag: "Night", tagIcon: Moon,
    intro: "Your body knows how to sleep. This helps your mind step aside.",
    steps: [
      { text: "Lie down and get still. The day is done.", duration: 5000 },
      { text: "Let your toes go. Release them.", duration: 12000 },
      { text: "Your legs… heavy and soft.", duration: 12000 },
      { text: "Your back… your belly… sinking down.", duration: 14000 },
      { text: "Your shoulders… dropping.", duration: 12000 },
      { text: "Your face… smooth and still.", duration: 12000 },
      { text: "Floating. Supported. Nothing to solve.", duration: 16000 },
      { text: "Thoughts come… let them pass.", duration: 14000 },
      { text: "You are safe. Everything is handled.", duration: 14000 },
      { text: "Nothing more to do. Just drift.", duration: 16000 },
    ]
  },
  {
    id: "body", title: "Body Release", subtitle: "Let tension melt away",
    image: NATURE.meadow, tag: "Tension", tagIcon: Wind,
    intro: "We carry emotion in our muscles. This releases what you have been holding.",
    steps: [
      { text: "Sit or lie comfortably. We will move through your body slowly.", duration: 5000 },
      { text: "Curl your toes tightly… hold… release.", duration: 12000 },
      { text: "Tighten your thighs… hold… let go.", duration: 12000 },
      { text: "Suck in your stomach… hold… exhale and soften.", duration: 14000 },
      { text: "Shrug your shoulders to your ears… hold… drop.", duration: 12000 },
      { text: "Scrunch your face… hold… smooth it out.", duration: 12000 },
      { text: "Scan your body. Feel how much lighter it is.", duration: 14000 },
    ]
  },
  {
    id: "peace", title: "Inner Peace", subtitle: "Return to your centre",
    image: NATURE.forest, tag: "Deep Calm", tagIcon: Leaf,
    intro: "For when you want to remember who you are beneath the noise.",
    steps: [
      { text: "Settle in. There is nowhere to be but here.", duration: 5000 },
      { text: "Breathe naturally. Just watch it rise and fall.", duration: 12000 },
      { text: "Imagine a place where you feel completely at ease.", duration: 14000 },
      { text: "Here you do not need to perform. You are enough.", duration: 14000 },
      { text: "Notice any tightness in your heart. You have been carrying this.", duration: 14000 },
      { text: "Set it down for a while. Just rest it.", duration: 14000 },
      { text: "Who are you without the worry? Sit with that.", duration: 16000 },
      { text: "You have survived everything that tried to break you.", duration: 14000 },
      { text: "Breathe in: I am enough. Breathe out: I release.", duration: 14000 },
      { text: "You have a centre. You can always find your way back.", duration: 14000 },
    ]
  },
  {
    id: "fire", title: "Desert Stillness", subtitle: "Warmth and endurance",
    image: NATURE.desert, tag: "Grounding", tagIcon: Flame,
    intro: "Like the desert at dusk — vast, patient, and unshakeable.",
    steps: [
      { text: "Sit still. Feel the weight of your body pressing down.", duration: 5000 },
      { text: "The desert is not empty. It is full of quiet.", duration: 12000 },
      { text: "Breathe slowly. In through the nose, out through the mouth.", duration: 14000 },
      { text: "You are allowed to be still. Nothing needs doing right now.", duration: 14000 },
      { text: "Let warmth spread through your chest.", duration: 12000 },
      { text: "You are stronger than you feel today.", duration: 14000 },
      { text: "Rest in that truth. Let it settle.", duration: 14000 },
    ]
  },
  {
    id: "winter", title: "Winter Rest", subtitle: "Quiet beneath the snow",
    image: NATURE.snow, tag: "Rest", tagIcon: Snowflake,
    intro: "The world slows in winter. Let yourself slow too.",
    steps: [
      { text: "Find stillness. Like snow settling.", duration: 5000 },
      { text: "Take a breath. Feel the cool, clean air.", duration: 12000 },
      { text: "Everything is hushed. You are allowed to be quiet.", duration: 14000 },
      { text: "Let your shoulders fall. Let your jaw unclench.", duration: 12000 },
      { text: "Rest is not laziness. Rest is renewal.", duration: 14000 },
      { text: "Under snow, the earth is resting too. You are in good company.", duration: 14000 },
      { text: "Breathe in stillness. Breathe out the rush.", duration: 14000 },
      { text: "You are allowed to do nothing right now.", duration: 14000 },
    ]
  },
  {
    id: "night", title: "Starlight", subtitle: "Small and infinite",
    image: NATURE.night, tag: "Perspective", tagIcon: Star,
    intro: "Under the stars, everything that felt urgent softens.",
    steps: [
      { text: "Look up — or imagine looking up — at a sky full of stars.", duration: 6000 },
      { text: "Each one is a sun. The universe is enormous.", duration: 12000 },
      { text: "And yet — you are here. Breathing. Present.", duration: 14000 },
      { text: "The things that worry you are real. And they are also very small.", duration: 14000 },
      { text: "You do not have to solve everything tonight.", duration: 12000 },
      { text: "Take a deep breath in. Feel yourself expand.", duration: 14000 },
      { text: "You belong to something vast. You are held.", duration: 14000 },
      { text: "Breathe in wonder. Breathe out pressure.", duration: 14000 },
    ]
  },
];

const POST_FEELINGS = [
  { label: "Calmer", emoji: "🌿", response: "That's the reset working. Hold onto it." },
  { label: "Lighter", emoji: "☁️", response: "Good. You put something down just now." },
  { label: "Still heavy", emoji: "💙", response: "That's okay. You still showed up. That counts." },
  { label: "Grateful", emoji: "💚", response: "Gratitude after stillness is real. Carry that." },
  { label: "Tired", emoji: "🌙", response: "Rest is the right response. Let yourself be tired." },
];

// ── PROGRESS RING ──────────────────────────────────────────────────────────
function ProgressRing({ progress = 0, size = 96, stroke = 2 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg width={size} height={size} className="med-progress-ring" style={{ position:"absolute" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.7)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s linear" }} />
    </svg>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function Meditations() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [postFeeling, setPostFeeling] = useState(null);
  const [bgKey, setBgKey] = useState(null);       // override background key
  const [showNaturePanel, setShowNaturePanel] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const audioRef = useRef(null);
  const stepTimerRef = useRef(null);
  const pausedStepRef = useRef(null);

  useEffect(() => () => { audioRef.current?.pause(); clearTimeout(stepTimerRef.current); }, []);

  const activeBg = bgKey ? NATURE[bgKey] : selected?.image;

  const start = (med) => {
    setSelected(med); setPlaying(false); setPaused(false);
    setStepIndex(0); setDone(false); setPostFeeling(null);
    setBgKey(null); setShowNaturePanel(false); setAudioProgress(0);
  };

  const exit = () => {
    audioRef.current?.pause(); audioRef.current = null;
    clearTimeout(stepTimerRef.current);
    setSelected(null); setPlaying(false); setPaused(false);
    setStepIndex(0); setDone(false); setPostFeeling(null);
    setBgKey(null); setShowNaturePanel(false); setAudioProgress(0);
  };

  // Audio progress tracker
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.duration) setAudioProgress(audio.currentTime / audio.duration);
    };
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [playing]);

  // Step-based timer with pause support
  const scheduleStep = (idx, med, delay) => {
    clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      if (idx + 1 >= med.steps.length) {
        setDone(true); setPlaying(false);
      } else {
        setStepIndex(idx + 1);
        scheduleStep(idx + 1, med, med.steps[idx + 1].duration);
      }
    }, delay);
  };

  const begin = () => {
    setPlaying(true); setPaused(false);
    if (selected.audioUrl) {
      const a = new Audio(selected.audioUrl);
      audioRef.current = a;
      a.play().catch(() => {});
      a.onended = () => { setDone(true); setPlaying(false); };
    } else {
      setStepIndex(0);
      scheduleStep(0, selected, selected.steps[0].duration);
    }
  };

  const togglePause = () => {
    if (selected.audioUrl) {
      if (paused) { audioRef.current?.play(); setPaused(false); }
      else { audioRef.current?.pause(); setPaused(true); }
    } else {
      if (paused) {
        setPaused(false);
        scheduleStep(stepIndex, selected, pausedStepRef.current ?? selected.steps[stepIndex].duration);
      } else {
        clearTimeout(stepTimerRef.current);
        pausedStepRef.current = selected.steps[stepIndex]?.duration ?? 8000;
        setPaused(true);
      }
    }
  };

  // ── PLAYING SCREEN ───────────────────────────────────────────────────────
  if (selected && playing) {
    return (
      <div className="med-sans" style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", position:"relative", overflow:"hidden" }}>
        {/* Background */}
        <div style={{ position:"absolute", inset:0, backgroundImage:`url(${activeBg})`, backgroundSize:"cover", backgroundPosition:"center" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.62)" }} />
        {/* Visualizer */}
        <div style={{ position:"absolute", inset:0 }}>{getVisualizer(selected.id)}</div>

        {/* Top bar */}
        <div style={{ position:"relative", zIndex:20, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 20px 0" }}>
          {selected.audioUrl
            ? <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <Volume2 size={13} style={{ color:"rgba(255,255,255,0.4)" }} />
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase" }}>Audio</span>
              </div>
            : <div style={{ display:"flex", gap:3, flex:1, marginRight:12 }}>
                {selected.steps.map((_, i) => (
                  <div key={i} style={{ height:2, flex:1, borderRadius:2, background: i <= stepIndex ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.15)", transition:"background 1s" }} />
                ))}
              </div>
          }
          <button onClick={exit} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
            <X size={20} style={{ color:"rgba(255,255,255,0.55)" }} />
          </button>
        </div>

        {/* Centre content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 32px", position:"relative", zIndex:10 }}>
          {/* Breathing ring */}
          <motion.div animate={{ scale:[1, 1.22, 1] }} transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }}
            style={{ width:180, height:180, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", position:"absolute" }} />

          {selected.audioUrl
            ? <div style={{ textAlign:"center" }}>
                <p className="med-serif" style={{ fontSize:13, color:"rgba(255,255,255,0.45)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:32 }}>{selected.title}</p>
                <p className="med-serif" style={{ fontSize:18, color:"rgba(255,255,255,0.65)", fontStyle:"italic", lineHeight:1.6 }}>
                  {paused ? "Paused — tap to continue" : "Close your eyes and listen…"}
                </p>
              </div>
            : <AnimatePresence mode="wait">
                <motion.p key={stepIndex}
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                  transition={{ duration:1.8, ease:"easeInOut" }}
                  className="med-serif"
                  style={{ fontSize:24, fontWeight:300, color:"rgba(255,255,255,0.92)", lineHeight:1.65, textAlign:"center", fontStyle:"italic" }}>
                  {selected.steps[stepIndex]?.text}
                </motion.p>
              </AnimatePresence>
          }
        </div>

        {/* Bottom controls */}
        <div style={{ position:"relative", zIndex:20, display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:48, gap:20 }}>
          {/* Nature switcher toggle */}
          <button onClick={() => setShowNaturePanel(v => !v)}
            style={{ background:"rgba(255,255,255,0.08)", border:"0.5px solid rgba(255,255,255,0.18)", color:"rgba(255,255,255,0.6)", borderRadius:99, padding:"6px 14px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <Leaf size={12} /> Change nature view
          </button>

          {/* Nature chips panel */}
          <AnimatePresence>
            {showNaturePanel && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                style={{ overflow:"hidden", width:"100%", padding:"0 20px" }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
                  {NATURE_OPTIONS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => { setBgKey(key); setShowNaturePanel(false); }}
                      className={`nature-chip ${bgKey === key ? "active" : ""}`}
                      style={{ background: bgKey === key ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.3)" }}>
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Play / Pause button */}
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {selected.audioUrl && <ProgressRing progress={audioProgress} size={104} stroke={2} />}
            <motion.button
              className="med-btn-play"
              onClick={togglePause}
              whileTap={{ scale: 0.93 }}
              style={{ width:72, height:72 }}>
              {paused
                ? <Play size={26} style={{ color:"rgba(255,255,255,0.9)", marginLeft:3 }} />
                : <Pause size={26} style={{ color:"rgba(255,255,255,0.9)" }} />
              }
            </motion.button>
          </div>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {paused ? "Tap to resume" : "Tap to pause"}
          </p>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ─────────────────────────────────────────────────────────
  if (selected && done) {
    return (
      <div className="med-sans" style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`url(${activeBg})`, backgroundSize:"cover", backgroundPosition:"center" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.68)" }} />

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, position:"relative", zIndex:10, textAlign:"center" }}>
          <motion.div initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.9 }}
            style={{ width:"100%", maxWidth:340 }}>

            <motion.div animate={{ scale:[1, 1.1, 1] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
              style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", margin:"0 auto 28px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(255,255,255,0.25)" }} />
            </motion.div>

            <h2 className="med-serif" style={{ fontSize:40, fontWeight:300, color:"#fff", margin:"0 0 8px" }}>Well done.</h2>
            <p className="med-serif" style={{ fontSize:17, color:"rgba(255,255,255,0.65)", fontStyle:"italic", marginBottom:36, lineHeight:1.6 }}>
              You showed up for yourself. That matters.
            </p>

            <AnimatePresence mode="wait">
              {!postFeeling
                ? <motion.div key="feelings" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>How do you feel?</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginBottom:32 }}>
                      {POST_FEELINGS.map(f => (
                        <button key={f.label} onClick={() => setPostFeeling(f.label)}
                          style={{ padding:"9px 16px", borderRadius:99, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.85)", fontSize:14, cursor:"pointer" }}>
                          {f.emoji} {f.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                : <motion.div key="response" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                    <p className="med-serif" style={{ fontSize:20, fontStyle:"italic", color:"rgba(255,255,255,0.8)", lineHeight:1.65, marginBottom:32 }}>
                      {POST_FEELINGS.find(f => f.label === postFeeling)?.response}
                    </p>
                  </motion.div>
              }
            </AnimatePresence>

            <button onClick={exit}
              style={{ padding:"12px 32px", borderRadius:99, background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.28)", color:"rgba(255,255,255,0.9)", fontSize:15, cursor:"pointer" }}>
              Return
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── DETAIL / INTRO SCREEN ───────────────────────────────────────────────
  if (selected) {
    return (
      <div className="med-sans" style={{ display:"flex", flexDirection:"column", minHeight:"100dvh", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`url(${selected.image})`, backgroundSize:"cover", backgroundPosition:"center" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.72) 100%)" }} />

        <button onClick={exit} style={{ position:"absolute", top:20, left:20, zIndex:20, background:"rgba(255,255,255,0.1)", border:"0.5px solid rgba(255,255,255,0.2)", borderRadius:"50%", width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <ArrowLeft size={18} style={{ color:"rgba(255,255,255,0.8)" }} />
        </button>

        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"32px 28px", position:"relative", zIndex:10 }}>
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.65 }}>
            <div className="med-pill" style={{ marginBottom:16 }}>
              {selected.tag}
            </div>

            <h1 className="med-serif" style={{ fontSize:42, fontWeight:300, color:"#fff", margin:"0 0 4px", lineHeight:1.1 }}>{selected.title}</h1>
            <p className="med-serif" style={{ fontSize:16, color:"rgba(255,255,255,0.5)", fontStyle:"italic", marginBottom:20 }}>
              {selected.audioUrl ? "Guided audio" : "Guided session"} · {selected.steps.length} steps
            </p>
            <p className="med-serif" style={{ fontSize:19, color:"rgba(255,255,255,0.8)", lineHeight:1.7, fontStyle:"italic", marginBottom:36 }}>
              {selected.intro}
            </p>

            <motion.button onClick={begin} whileTap={{ scale:0.97 }}
              style={{ width:"100%", padding:"17px 0", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.35)", borderRadius:16, color:"#fff", fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, backdropFilter:"blur(10px)" }}>
              <Play size={18} style={{ marginLeft:2 }} />
              <span className="med-serif" style={{ fontWeight:400, letterSpacing:"0.02em" }}>Begin when ready</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── LIST SCREEN ─────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <div className="med-sans" style={{ padding:"56px 20px 100px", minHeight:"100vh" }}>
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:28 }}>
          <h1 className="med-serif" style={{ fontSize:36, fontWeight:300, marginBottom:4, letterSpacing:"-0.01em" }}>Meditations</h1>
          <p style={{ color:"var(--color-text-secondary)", fontSize:15 }}>Choose a session. Find your still point.</p>
        </motion.div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {MEDITATIONS.map((med, i) => {
            const Icon = med.tagIcon ?? Leaf;
            return (
              <motion.button key={med.id} initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.06 }} onClick={() => start(med)}
                className="med-card" style={{ height:170, width:"100%", textAlign:"left", display:"block" }}>
                <img src={med.image} alt={med.title}
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.78) 100%)" }} />
                <div style={{ position:"absolute", inset:0, padding:"0 18px 16px", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
                  <div className="med-pill" style={{ marginBottom:8, width:"fit-content" }}>
                    <Icon size={11} /> {med.tag}
                  </div>
                  <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                    <div>
                      <p className="med-serif" style={{ fontSize:22, color:"#fff", fontWeight:400, margin:"0 0 2px" }}>{med.title}</p>
                      <p style={{ fontSize:13, color:"rgba(255,255,255,0.6)", margin:0 }}>{med.subtitle}</p>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                      {med.audioUrl && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.12)", padding:"3px 8px", borderRadius:99 }}>
                          <Volume2 size={11} style={{ color:"rgba(255,255,255,0.7)" }} />
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>Audio</span>
                        </div>
                      )}
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{med.steps.length} steps</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
