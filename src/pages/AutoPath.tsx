import { useSession } from "@/contexts/SessionContext";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Wind, Mic, Sunrise, Leaf, Zap, Brain } from "lucide-react";

export default function AutoPath() {
  const { emotionalState, timeOfDay } = useSession();

  const getRecommendations = () => {
    switch (emotionalState) {
      case "Anxious":
        return [
          { title: "30-Second Reset", desc: "Breathing + grounding to stop the spiral now.", icon: Wind, href: "/quick-reset", tag: "Fastest" },
          { title: "Physiological Sigh", desc: "Stanford's fastest stress-reduction technique — one breath.", icon: Zap, href: "/techniques", tag: "Science-backed" },
          { title: "Anxiety Relief Meditation", desc: "A guided 10-minute session to quiet the alarm.", icon: Leaf, href: "/meditations", tag: "10 min" },
        ];
      case "Overwhelmed":
        return [
          { title: "30-Second Reset", desc: "Quick grounding when everything feels like too much.", icon: Wind, href: "/quick-reset", tag: "Fastest" },
          { title: "Box Breathing", desc: "The Navy SEAL technique for performing under pressure.", icon: Brain, href: "/techniques", tag: "Proven" },
          { title: "Full Reset", desc: "A guided 5-minute journey back to calm.", icon: Sunrise, href: "/full-reset", tag: "5 min" },
        ];
      case "Heavy":
      case "Numb":
        return [
          { title: "Speak & Release", desc: "A safe place to set down what you've been carrying.", icon: Mic, href: "/speak", tag: "Express" },
          { title: "Body Release Meditation", desc: "Melt the weight you're holding in your muscles.", icon: Leaf, href: "/meditations", tag: "8 min" },
          { title: "Progressive Relaxation", desc: "Release physical tension, and the emotional follows.", icon: Brain, href: "/techniques", tag: "Deep" },
        ];
      case "Scattered":
      case "Restless":
        return [
          { title: "30-Second Reset", desc: "Return to your body. Three phases. Simple.", icon: Wind, href: "/quick-reset", tag: "Grounding" },
          { title: "4-7-8 Breathing", desc: "A natural tranquilizer for a restless nervous system.", icon: Zap, href: "/techniques", tag: "Calming" },
          { title: "Morning Clarity", desc: "Find a quiet center even in a noisy day.", icon: Leaf, href: "/meditations", tag: "7 min" },
        ];
      case "Tired":
        return [
          { title: "Sleep Preparation", desc: "A 15-minute guide into deep rest.", icon: Leaf, href: "/meditations", tag: "Night" },
          { title: "Full Reset", desc: "Body scan + 4-7-8 breathing for restoration.", icon: Sunrise, href: "/full-reset", tag: "5 min" },
          { title: "Night System", desc: "A gentle wind-down for when the day is done.", icon: Sunrise, href: "/night", tag: "Wind down" },
        ];
      default:
        return [
          { title: "Full Reset", desc: "A guided 5-minute calm sequence.", icon: Sunrise, href: "/full-reset", tag: "5 min" },
          { title: "Inner Peace Meditation", desc: "Return to your center when you have the time.", icon: Leaf, href: "/meditations", tag: "12 min" },
          { title: "5 Techniques", desc: "Explore the full toolkit for lasting calm.", icon: Brain, href: "/techniques", tag: "Explore" },
        ];
    }
  };

  const getOpeningMessage = () => {
    if (emotionalState === "Anxious") return "Anxiety tells you danger is everywhere. Right now, you are safe. Let's prove it to your body.";
    if (emotionalState === "Overwhelmed") return "Everything feels like it's happening at once. We're going to slow it all down to just this moment.";
    if (emotionalState === "Heavy" || emotionalState === "Numb") return "Sometimes feeling nothing is its own kind of pain. You don't have to explain it. We're just going to sit with it.";
    if (emotionalState === "Scattered") return "Your mind is going in ten directions. That's okay. We can find the thread back to you.";
    if (emotionalState === "Tired") return "You've been giving a lot. What you need right now is real rest — not distraction.";
    if (emotionalState === "Restless") return "That restless feeling has a root. Let's help your body settle so your mind can too.";
    return "Even on ordinary days, a moment of stillness is a gift. You came here — that's already something.";
  };

  const recs = getRecommendations();

  return (
    <PageTransition>
      <div className="px-6 pt-16 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-serif tracking-tight mb-3">We hear you.</h1>
          <p className="text-muted-foreground text-base leading-relaxed">{getOpeningMessage()}</p>
        </motion.div>

        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Recommended for you</p>

        <div className="flex flex-col gap-3">
          {recs.map((rec, i) => (
            <motion.div
              key={rec.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
            >
              <Link href={rec.href}>
                <div
                  className="bg-card border border-border p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] flex items-center gap-4 cursor-pointer"
                  data-testid={`card-path-${rec.href.replace("/", "")}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <rec.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{rec.title}</h3>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">{rec.tag}</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-snug mt-0.5">{rec.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {timeOfDay === "night" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <Link href="/night">
              <div className="p-4 bg-muted/50 border border-border rounded-2xl text-center cursor-pointer hover:bg-muted/70 transition-colors">
                <p className="text-muted-foreground text-sm">It's late — try the <span className="text-foreground font-medium">Night System</span> for sleep</p>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
