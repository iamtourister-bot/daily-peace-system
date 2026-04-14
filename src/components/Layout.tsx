import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Heart, BookOpen, Menu, Moon, Sun, Mic, Info, VolumeX, AlertCircle, X, Leaf, Wind, Brain, BarChart2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const hideNav = ["/quick-reset", "/full-reset", "/night", "/audio-calm"].includes(location);
  const hiddenFloating = hideNav || ["/meditations", "/quick-reset", "/full-reset", "/audio-calm"].includes(location);
  const isWelcome = location === "/";

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/state", icon: Heart, label: "Reset", active: ["/state", "/path", "/quick-reset", "/full-reset"] },
    { href: "/meditations", icon: Leaf, label: "Meditate" },
    { href: "/gratitude", icon: BookOpen, label: "Gratitude" },
    { href: "#more", icon: Menu, label: "More", isMore: true },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.isMore) return isMoreOpen;
    if (item.active) return item.active.includes(location);
    return location === item.href;
  };

  return (
    <div className="mx-auto max-w-[430px] w-full min-h-[100dvh] flex flex-col relative bg-background overflow-hidden shadow-2xl">

      {!isWelcome && !hideNav && (
        <div className="absolute top-0 left-0 right-0 z-30 flex justify-end px-5 pt-5 pointer-events-none">
          <button
            onClick={toggleTheme}
            className="pointer-events-auto w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
            data-testid="btn-toggle-theme-floating"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col w-full h-full overflow-y-auto pb-24 relative z-0">
        {children}
      </main>

      {!hiddenFloating && (
        <div className="fixed bottom-20 right-4 z-40" style={{ maxWidth: "calc(430px - 8px)" }}>
          <Link href="/quick-reset">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-lg font-medium flex items-center gap-2 text-sm"
              data-testid="btn-floating-reset"
            >
              <Heart className="w-4 h-4" />
              Reset me now
            </motion.button>
          </Link>
        </div>
      )}

      {!hideNav && (
        <nav className="absolute bottom-0 w-full bg-card/95 backdrop-blur-md border-t border-border px-2 py-2 flex justify-between items-center z-50">
          {navItems.map((item) => (
            item.isMore ? (
              <button
                key="more"
                onClick={() => setIsMoreOpen(true)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${isMoreOpen ? "text-primary" : "text-muted-foreground"}`}
                data-testid="btn-nav-more"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ) : (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                    isActive(item)
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`btn-nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className={`w-5 h-5 ${isActive(item) ? "stroke-[2.5]" : ""}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              </Link>
            )
          ))}
        </nav>
      )}

      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 max-w-[430px] mx-auto"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="absolute bottom-0 w-full bg-card rounded-t-3xl shadow-2xl z-50 p-6 pb-10 flex flex-col gap-4"
            >
              <div className="w-10 h-1 rounded-full bg-border mx-auto -mt-1 mb-1" />
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xl text-foreground">More</h3>
                <button onClick={() => setIsMoreOpen(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                  <div>
                    <p className="font-semibold text-foreground text-sm">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
                    <p className="text-muted-foreground text-xs">Tap to switch</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-13 h-7 rounded-full p-1 transition-colors duration-300 ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
                  style={{ width: 52 }}
                  data-testid="btn-toggle-dark-mode"
                >
                  <motion.div
                    layout
                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                    animate={{ x: theme === "dark" ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { href: "/mood-history", icon: BarChart2, label: "My Week", sub: "Mood reflection" },
                  { href: "/letter-to-self", icon: PenLine, label: "Letter to Myself", sub: "Future self" },
                  { href: "/techniques", icon: Brain, label: "5 Techniques", sub: "Science-backed" },
                  { href: "/speak", icon: Mic, label: "Speak & Release", sub: "Voice journal" },
                  { href: "/audio-calm", icon: VolumeX, label: "Sound Bath", sub: "10 ambient sounds" },
                  { href: "/calming-room", icon: Wind, label: "Calming Room", sub: "Sounds for peace" },
                  { href: "/sleep-stories", icon: Moon, label: "Sleep Stories", sub: "Drift into sleep" },
                  { href: "/night", icon: Moon, label: "Night System", sub: "Wind down" },
                  { href: "/learn", icon: BookOpen, label: "Learn", sub: "How it works" },
                  { href: "/about", icon: Info, label: "About Reset", sub: "Our mission" },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setIsMoreOpen(false)}>
                    <div className="p-4 bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded-2xl flex flex-col gap-2 items-start cursor-pointer transition-colors">
                      <item.icon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-tight">{item.label}</p>
                        <p className="text-muted-foreground text-xs">{item.sub}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/crisis" onClick={() => setIsMoreOpen(false)}>
                <div className="p-4 bg-destructive/8 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-destructive/12 transition-colors">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">I need more help right now</p>
                    <p className="text-xs opacity-70">Crisis resources & support</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
