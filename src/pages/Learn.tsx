import { PageTransition } from "@/components/PageTransition";
import { BookOpen, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const articles = [
  {
    id: 1,
    title: "Why your mind feels overwhelmed",
    content: "Overwhelm is not weakness. It means your nervous system is processing too much at once. Think of your brain like a computer with too many tabs open — it slows down and triggers a stress response.\n\nThe fix: breathe slowly, step away from screens, and focus on one physical object. You are clearing the cache."
  },
  {
    id: 2,
    title: "How to calm racing thoughts",
    content: "Racing thoughts are fueled by adrenaline. Fighting them with more thinking is like putting out a fire with gasoline.\n\nInstead — shift attention to your body. Where do you feel the tension? Moving awareness from your mind to your body grounds you in the present and starves anxious thoughts of energy."
  },
  {
    id: 3,
    title: "What anxiety actually is",
    content: "Anxiety is your body's alarm system — built to protect you from danger. The problem is your brain cannot tell the difference between a real threat and a stressful email.\n\nIt is a biological response, not a flaw in who you are. Knowing this is the first step to managing it."
  },
  {
    id: 4,
    title: "The science of breathing",
    content: "When you inhale, your heart rate rises. When you exhale, it slows. By making exhales longer than inhales, you activate the vagus nerve — which signals your brain to rest.\n\nThis is not just mental. You are physically overriding your stress response with your breath."
  },
  {
    id: 5,
    title: "Why breathing is the fastest reset",
    content: "Of all the tools available to calm your mind, breathing is the only one you always have with you. It works in seconds. It costs nothing. And it is scientifically proven to lower cortisol — the stress hormone — within minutes.\n\nOne slow breath is not small. It is a direct message to your brain that you are safe."
  },
  {
    id: 6,
    title: "How sleep affects your mental health",
    content: "Poor sleep does not just make you tired — it makes anxiety worse, lowers your ability to handle stress, and makes negative thoughts feel more intense.\n\nEven one good night of sleep can reset your emotional baseline. Wind-down rituals, no screens before bed, and slow breathing at night are the most powerful sleep tools you have."
  },
  {
    id: 7,
    title: "Why gratitude rewires your brain",
    content: "Gratitude is not about pretending everything is fine. It is about training your brain to notice what is working — even when things are hard.\n\nStudies show that writing down 3 things you are grateful for daily increases dopamine and serotonin — the same chemicals targeted by antidepressants. Over time, your brain starts scanning for the good automatically."
  },
  {
    id: 8,
    title: "How to stop a panic attack",
    content: "When a panic attack hits: stop moving, plant your feet on the ground, and breathe out slowly — longer than your inhale.\n\nThen name 5 things you can see. This grounds your senses in reality and signals to your nervous system that there is no real danger. The attack cannot last. Your body physically cannot sustain that level of adrenaline for long."
  },
  {
    id: 9,
    title: "The power of a single pause",
    content: "You do not need a 30-minute meditation to reset. Research shows that even a 60-second pause — eyes closed, breathing slowly — measurably reduces stress hormones.\n\nThe pause is not doing nothing. It is doing the most important thing: interrupting the cycle before it takes over."
  },
  {
    id: 10,
    title: "Why you feel anxious for no reason",
    content: "Sometimes anxiety arrives with no obvious cause. This is often your body responding to accumulated stress — built up over days or weeks — that finally surfaces.\n\nYou do not always need a reason to feel anxious. And you do not need to find one to feel better. What your body needs is release, not explanation."
  },
  {
    id: 11,
    title: "What stress does to your body",
    content: "Chronic stress tightens muscles, raises blood pressure, disrupts digestion, weakens immunity and disturbs sleep. It is not just in your head — it is in your entire body.\n\nThis is why physical tools like breathing, movement and rest are not optional extras. They are the actual medicine."
  },
  {
    id: 12,
    title: "Why small resets matter more than big ones",
    content: "Most people wait until they are completely overwhelmed before doing something about it. But small daily resets — even 2 minutes of breathing — prevent the buildup that leads to burnout.\n\nConsistency beats intensity every time. A small pause every day is worth more than one big reset every month."
  },
];

export default function Learn() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <PageTransition>
      <div className="px-6 pt-20 pb-32">
        <div className="mb-10">
          <h1 className="text-3xl font-serif tracking-tight mb-3">Understanding the mind.</h1>
          <p className="text-muted-foreground text-lg">
            Knowledge removes fear. Learn how your nervous system actually works.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base text-foreground">{article.title}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === article.id ? 180 : 0 }}
                  className="text-muted-foreground shrink-0 ml-2"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedId === article.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border mt-2">
                      {article.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
