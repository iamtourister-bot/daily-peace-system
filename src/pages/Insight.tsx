import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useSession } from "@/contexts/SessionContext";
import { Sunrise, Moon, Wind, Shield, Brain, Heart } from "lucide-react";

const NATURE_BG = "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&auto=format&fit=crop&q=80";

export default function Insight() {
  const { emotionalState, timeOfDay } = useSession();

  const getInsights = () => {
    switch (emotionalState) {
      case "Anxious":
        return [
          { title: "The Alarm System", text: "Anxiety is your body's alarm system misfiring. You just proved to it that you are safe — right here, right now.", icon: Shield },
          { title: "Breathe to Signal Safety", text: "Deep, slow breathing physically lowers your heart rate, sending an 'all clear' signal from body to brain.", icon: Wind },
        ];
      case "Overwhelmed":
        return [
          { title: "One Thing at a Time", text: "The mind panics when it tries to hold everything at once. You've released the grip — even briefly. That changes everything.", icon: Brain },
          { title: "Nervous System Reset", text: "You've just activated your parasympathetic nervous system — the rest-and-digest state that counters overwhelm.", icon: Shield },
        ];
      case "Heavy":
      case "Tired":
        return [
          { title: "Permission to Rest", text: "Heaviness is often accumulated fatigue. Resting isn't quitting. It's how strength comes back.", icon: Moon },
          { title: "Drop Tomorrow's Weight", text: "You don't have to carry tomorrow's problems today. Your only job right now is to breathe and exist.", icon: Heart },
        ];
      case "Numb":
        return [
          { title: "Numbness is Protection", text: "When emotions are too much, the mind goes quiet to protect you. This isn't broken — it's intelligent.", icon: Shield },
          { title: "Gentle Return", text: "Feeling nothing can shift slowly. Physical grounding — breath, sensation — is often the first thread back.", icon: Wind },
        ];
      case "Scattered":
      case "Restless":
        return [
          { title: "Your Attention Returned", text: "A scattered mind finds stillness hard. The fact you're here, calmer now, is a real accomplishment.", icon: Brain },
          { title: "Grounding Works", text: "Moving from abstract worry to physical sensation (breath, body, environment) is the fastest path back to center.", icon: Shield },
        ];
      default:
        return [
          { title: "Nervous System Shift", text: "You've successfully shifted from a sympathetic (fight/flight) state to parasympathetic (rest/recover). That took courage.", icon: Shield },
          { title: "Building Resilience", text: "Small, consistent resets build emotional resilience over time. Every pause you take strengthens the next one.", icon: Sunrise },
        ];
    }
  };

  const getCompletionMessage = () => {
    if (emotionalState === "Anxious") return "The storm passed. It always does.";
    if (emotionalState === "Overwhelmed") return "You found the floor under your feet again.";
    if (emotionalState === "Heavy" || emotionalState === "Tired") return "You gave yourself exactly what you needed.";
    if (emotionalState === "Numb") return "You showed up, even when it was hard.";
    return "You did something real for yourself today.";
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        <div className="relative h-52 overflow-hidden shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${NATURE_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-background" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute bottom-0 left-0 px-6 pb-6"
          >
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Your Reset is Complete</p>
            <h1 className="text-2xl font-serif text-white leading-tight">{getCompletionMessage()}</h1>
          </motion.div>
          <div className="absolute top-5 right-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"
            >
              <Heart className="w-5 h-5 text-white" />
            </motion.div>
          </div>
        </div>

        <div className="px-6 pt-6 pb-32 flex flex-col gap-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base leading-relaxed"
          >
            Taking a moment to pause is how we interrupt cycles of overwhelm. You did that.
          </motion.p>

          <div className="flex flex-col gap-3 mt-2">
            {getInsights().map((insight, i) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="bg-card border border-border p-5 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-foreground">{insight.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{insight.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-4 flex flex-col gap-3"
          >
            <Link href="/meditations">
              <button className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold">
                Extend with meditation
              </button>
            </Link>
            <Link href="/">
              <button className="w-full py-3 text-muted-foreground hover:text-foreground font-medium transition-colors">
                {timeOfDay === "night" ? "Rest now. Come back tomorrow." : "Return to home"}
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
