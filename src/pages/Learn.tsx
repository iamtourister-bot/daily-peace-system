import { PageTransition } from "@/components/PageTransition";
import { BookOpen, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const articles = [
  {
    id: 1,
    title: "Why your mind feels overwhelmed",
    content: "Overwhelm isn't a sign of weakness; it's a sign that your nervous system is processing too much data at once. Think of your brain like a computer with too many tabs open. When the working memory is full, the system slows down and triggers a stress response.\n\nTo counter this, you must physically signal to your body that you are safe. Deep breathing, stepping away from screens, and focusing on a single physical object can help clear the cache."
  },
  {
    id: 2,
    title: "How to calm racing thoughts",
    content: "Racing thoughts are usually fueled by adrenaline and cortisol. Trying to stop them by 'thinking harder' is like trying to put out a fire with gasoline.\n\nInstead of fighting the thoughts, shift your attention to your body. Where do you feel the anxiety? By moving your awareness from your mind to your physical sensations, you begin to ground yourself in the present moment, starving the anxious thoughts of the energy they need to race."
  },
  {
    id: 3,
    title: "What anxiety actually is",
    content: "Anxiety is simply your body's alarm system. It evolved to keep you safe from predators. The problem is, your brain can't tell the difference between a real physical threat and a stressful email.\n\nWhen you feel anxious, your body is preparing you to fight or run away. This is why you feel restless, sweaty, or have a racing heart. Acknowledging that this is just a biological response—not a fundamental flaw in who you are—is the first step to managing it."
  },
  {
    id: 4,
    title: "The science of breathing",
    content: "When you inhale, your heart rate speeds up slightly. When you exhale, it slows down. By making your exhales longer than your inhales, you activate the vagus nerve, which tells your brain to enter a state of 'rest and digest'.\n\nThis isn't just a mental trick; it's a physiological hack. You are literally overriding your nervous system's stress response by manually controlling your breath."
  }
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
                  <h3 className="font-semibold text-lg text-foreground">{article.title}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === article.id ? 180 : 0 }}
                  className="text-muted-foreground shrink-0"
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
