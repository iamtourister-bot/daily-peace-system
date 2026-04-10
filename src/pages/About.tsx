import { PageTransition } from "@/components/PageTransition";

export default function About() {
  return (
    <PageTransition>
      <div className="px-6 pt-20 pb-32 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
          <div className="w-10 h-10 rounded-full bg-primary" />
        </div>
        
        <h1 className="text-3xl font-serif tracking-tight mb-8">About Reset</h1>
        
        <div className="text-left bg-card border border-border p-8 rounded-3xl shadow-sm text-foreground space-y-6 text-lg leading-relaxed">
          <p>
            This was built because too many people suffer alone in their own minds.
          </p>
          <p>
            When you're overwhelmed, the last thing you need is a complicated app with hundreds of choices, tracking streaks, and gamification.
          </p>
          <p>
            You just need a quiet place to go. A system that tells you exactly what to do to calm down.
          </p>
          <p className="font-serif italic text-primary">
            You deserve a moment of peace.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
