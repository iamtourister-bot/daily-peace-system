import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SECRET_CODE = "RESET2026";
const STORAGE_KEY = "reset_access_granted";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setGranted(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = () => {
    if (code.trim().toUpperCase() === SECRET_CODE) {
      localStorage.setItem(STORAGE_KEY, "true");
      setGranted(true);
      setError(false);
    } else {
      setError(true);
      setCode("");
    }
  };

  if (checking) return null;
  if (granted) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background items-center justify-center px-6">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="text-3xl">🌿</span>
          </div>

          <h1 className="text-3xl font-serif text-foreground mb-2">Reset</h1>
          <p className="text-muted-foreground text-sm mb-10">
            Your daily peace system
          </p>

          <div className="w-full bg-card border border-border rounded-3xl p-6 mb-4">
            <p className="text-foreground font-medium mb-1">Enter your access code</p>
            <p className="text-muted-foreground text-xs mb-6">
              Found in your PDF after purchase
            </p>

            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter code..."
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-center text-foreground text-lg tracking-widest uppercase outline-none focus:border-primary transition-colors mb-4"
              autoCapitalize="characters"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-destructive text-sm mb-4"
              >
                Invalid code. Please check your PDF and try again.
              </motion.p>
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-medium hover:bg-primary/90 transition-colors"
            >
              Enter Reset
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Don't have a code?{" "}
            
              href="https://gumroad.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Get access here
            </a>
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
