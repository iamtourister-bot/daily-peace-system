import { useTheme } from "@/contexts/ThemeContext";
import { useSession } from "@/contexts/SessionContext";
import { Link } from "wouter";
import { Moon, Sun, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";

const NATURE_SCENES = [
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
    credit: "Mountain at dawn"
  },
  {
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
    credit: "Forest path"
  },
  {
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
    credit: "Mountain lake"
  },
  {
    url: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&auto=format&fit=crop&q=80",
    credit: "Open meadow"
  },
];

const getDailyScene = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return NATURE_SCENES[dayOfYear % NATURE_SCENES.length];
};

export default function Welcome() {
  const { theme, toggleTheme } = useTheme();
  const { timeOfDay } = useSession();
  const scene = getDailyScene();

  const getGreeting = () => {
    switch (timeOfDay) {
      case "morning": return "Good morning.";
      case "afternoon": return "Good afternoon.";
      case "evening": return "Good evening.";
      case "night": return "It's late.";
    }
  };

  const getSubline = () => {
    switch (timeOfDay) {
      case "morning": return "Let's set the tone for today.";
      case "afternoon": return "A moment to recenter.";
      case "evening": return "Time to wind down.";
      case "night": return "Rest is within reach.";
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-[100dvh] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${scene.url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/70" />

        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2.5 text-white/70 hover:text-white transition-colors z-10 bg-black/20 rounded-full backdrop-blur-sm"
          data-testid="btn-toggle-theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="flex-1 flex flex-col justify-end p-8 pb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-4">Reset</p>
            <h1 className="text-5xl font-serif text-white mb-2 leading-tight">{getGreeting()}</h1>
            <p className="text-white/70 text-xl mb-10">{getSubline()}</p>

            <Link href="/state">
              <button
                className="w-full bg-white/15 text-white py-4 rounded-2xl font-medium text-lg border border-white/30 backdrop-blur-sm hover:bg-white/25 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                data-testid="btn-begin"
              >
                Begin your reset
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>

            <Link href="/quick-reset">
              <button
                className="w-full mt-3 text-white/70 py-3 rounded-2xl font-medium text-base hover:text-white transition-colors"
                data-testid="btn-quick-reset"
              >
                30-second reset
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
