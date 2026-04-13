import { useRef, useCallback, useState, useEffect } from "react";

export type SoundId = "rain" | "thunder" | "ocean" | "forest" | "bowl" | "noise" | "brown" | "fire" | "autumn" | "wind";

function makePinkNoise(ctx: AudioContext, duration = 4): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5 + w*0.5362) * 0.11;
    }
  }
  return buffer;
}

function makeBrownNoise(ctx: AudioContext, duration = 4): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * w) / 1.02;
      data[i] = lastOut * 3.5;
    }
  }
  return buffer;
}

function makeWhiteNoise(ctx: AudioContext, duration = 4): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const [playing, setPlaying] = useState<SoundId | null>(null);
  const [volume, setVolumeState] = useState(0.7);

  useEffect(() => {
    const unlock = async () => {
      try {
        if (!ctxRef.current) {
          ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (ctxRef.current.state === "suspended") {
          await ctxRef.current.resume();
        }
        const buffer = ctxRef.current.createBuffer(1, 1, 22050);
        const source = ctxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(ctxRef.current.destination);
        source.start(0);
        source.disconnect();
      } catch (e) {}
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("mousedown", unlock);
    };
    document.addEventListener("touchstart", unlock, { passive: true });
    document.addEventListener("touchend", unlock, { passive: true });
    document.addEventListener("mousedown", unlock, { passive: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("mousedown", unlock);
    };
  }, []);

  const getCtx = async (): Promise<AudioContext> => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const stop = useCallback(() => {
    cleanupRef.current.forEach(fn => { try { fn(); } catch {} });
    cleanupRef.current = [];
    masterGainRef.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback(async (id: SoundId) => {
    stop();
    const ctx = await getCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.connect(ctx.destination);
    masterGainRef.current = master;
    const cleanups: (() => void)[] = [() => { master.disconnect(); }];

    // 1. GENTLE RAIN
    if (id === "rain") {
      const source = ctx.createBufferSource();
      source.buffer = makePinkNoise(ctx, 6);
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      filter.Q.value = 0.3;
      const drip = ctx.createBiquadFilter();
      drip.type = "peaking";
      drip.frequency.value = 3000;
      drip.gain.value = 4;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.9;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.07;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.12;
      lfo.connect(lfoAmp);
      lfoAmp.connect(gainNode.gain);
      lfo.start();
      source.connect(filter);
      filter.connect(drip);
      drip.connect(gainNode);
      gainNode.connect(master);
      source.start();
      cleanups.push(() => {
        try { source.stop(); source.disconnect(); } catch {}
        try { lfo.stop(); lfo.disconnect(); } catch {}
        filter.disconnect(); drip.disconnect(); gainNode.disconnect(); lfoAmp.disconnect();
      });
    }

    // 2. RAIN & THUNDER
    if (id === "thunder") {
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = makePinkNoise(ctx, 6);
      rainSrc.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "lowpass";
      rainFilter.frequency.value = 2000;
      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.8;
      rainSrc.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(master);
      rainSrc.start();

      let active = true;
      const scheduleThunder = () => {
        if (!active) return;
        const delay = 8000 + Math.random() * 15000;
        const t = setTimeout(() => {
          if (!active) return;
          const now = ctx.currentTime;
          const thunderBuf = makeBrownNoise(ctx, 3);
          const thunderSrc = ctx.createBufferSource();
          thunderSrc.buffer = thunderBuf;
          const thunderFilter = ctx.createBiquadFilter();
          thunderFilter.type = "lowpass";
          thunderFilter.frequency.value = 200;
          const thunderGain = ctx.createGain();
          thunderGain.gain.setValueAtTime(0, now);
          thunderGain.gain.linearRampToValueAtTime(1.5, now + 0.1);
          thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 3);
          thunderSrc.connect(thunderFilter);
          thunderFilter.connect(thunderGain);
          thunderGain.connect(master);
          thunderSrc.start(now);
          thunderSrc.stop(now + 3);
          scheduleThunder();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleThunder();

      cleanups.push(() => {
        active = false;
        try { rainSrc.stop(); rainSrc.disconnect(); } catch {}
        rainFilter.disconnect(); rainGain.disconnect();
      });
    }

    // 3. OCEAN WAVES
    if (id === "ocean") {
      const source = ctx.createBufferSource();
      source.buffer = makeBrownNoise(ctx, 8);
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.45;
      lfo.connect(lfoAmp);
      lfoAmp.connect(waveGain.gain);
      lfo.start();
      source.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(master);
      source.start();
      cleanups.push(() => {
        try { source.stop(); source.disconnect(); } catch {}
        try { lfo.stop(); lfo.disconnect(); } catch {}
        filter.disconnect(); waveGain.disconnect(); lfoAmp.disconnect();
      });
    }

    // 4. FOREST BIRDS
    if (id === "forest") {
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = makePinkNoise(ctx, 6);
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.4;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.28;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSrc.start();
      let active = true;
      const scheduleChirp = () => {
        if (!active) return;
        const delay = 1500 + Math.random() * 4000;
        const t = setTimeout(() => {
          if (!active) return;
          const freq = 1600 + Math.random() * 1400;
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.connect(g);
          g.connect(master);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
          scheduleChirp();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleChirp();
      cleanups.push(() => {
        active = false;
        try { windSrc.stop(); windSrc.disconnect(); } catch {}
        windFilter.disconnect(); windGain.disconnect();
      });
    }

    // 5. TIBETAN BOWL
    if (id === "bowl") {
      let active = true;
      const playBowl = () => {
        if (!active) return;
        const now = ctx.currentTime;
        const freq = 432;
        const osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.value = freq;
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq * 2.76;
        const osc3 = ctx.createOscillator();
        osc3.type = "sine";
        osc3.frequency.value = freq * 5.41;
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.55, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 9);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.18, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 7);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.06, now);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 4);
        osc1.connect(g1); g1.connect(master);
        osc2.connect(g2); g2.connect(master);
        osc3.connect(g3); g3.connect(master);
        osc1.start(now); osc2.start(now); osc3.start(now);
        osc1.stop(now + 10); osc2.stop(now + 10); osc3.stop(now + 10);
      };
      playBowl();
      const interval = setInterval(() => { if (active) playBowl(); }, 11000);
      cleanups.push(() => { active = false; clearInterval(interval); });
    }

    // 6. WHITE NOISE
    if (id === "noise") {
      const source = ctx.createBufferSource();
      source.buffer = makeWhiteNoise(ctx, 4);
      source.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 120;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 8000;
      source.connect(hp);
      hp.connect(lp);
      lp.connect(master);
      source.start();
      cleanups.push(() => {
        try { source.stop(); source.disconnect(); } catch {}
        hp.disconnect(); lp.disconnect();
      });
    }

    // 7. BROWN NOISE
    if (id === "brown") {
      const source = ctx.createBufferSource();
      source.buffer = makeBrownNoise(ctx, 6);
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 500;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.8;
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(master);
      source.start();
      cleanups.push(() => {
        try { source.stop(); source.disconnect(); } catch {}
        filter.disconnect(); gainNode.disconnect();
      });
    }

    // 8. FIREPLACE
    if (id === "fire") {
      const src = ctx.createBufferSource();
      src.buffer = makePinkNoise(ctx, 4);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1000;
      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.15;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.2;
      lfo.connect(lfoAmp);
      lfoAmp.connect(crackleGain.gain);
      lfo.start();
      src.connect(lp);
      lp.connect(crackleGain);
      crackleGain.connect(master);
      src.start();

      let active = true;
      const scheduleCrackle = () => {
        if (!active) return;
        const delay = 500 + Math.random() * 2000;
        const t = setTimeout(() => {
          if (!active) return;
          const now = ctx.currentTime;
          const buf = makeWhiteNoise(ctx, 0.1);
          const crk = ctx.createBufferSource();
          crk.buffer = buf;
          const crkFilter = ctx.createBiquadFilter();
          crkFilter.type = "bandpass";
          crkFilter.frequency.value = 2000 + Math.random() * 3000;
          crkFilter.Q.value = 5;
          const crkGain = ctx.createGain();
          crkGain.gain.setValueAtTime(0.15, now);
          crkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          crk.connect(crkFilter);
          crkFilter.connect(crkGain);
          crkGain.connect(master);
          crk.start(now);
          crk.stop(now + 0.1);
          scheduleCrackle();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleCrackle();

      cleanups.push(() => {
        active = false;
        try { src.stop(); src.disconnect(); } catch {}
        try { lfo.stop(); lfo.disconnect(); } catch {}
        lp.disconnect(); crackleGain.disconnect(); lfoAmp.disconnect();
      });
    }

    // 9. AUTUMN WIND
    if (id === "autumn") {
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = makePinkNoise(ctx, 8);
      windSrc.loop = true;
      const windBp = ctx.createBiquadFilter();
      windBp.type = "bandpass";
      windBp.frequency.value = 800;
      windBp.Q.value = 0.3;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.05;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.35;
      lfo.connect(lfoAmp);
      lfoAmp.connect(windGain.gain);
      lfo.start();
      windSrc.connect(windBp);
      windBp.connect(windGain);
      windGain.connect(master);
      windSrc.start();

      let active = true;
      const scheduleLeafRustle = () => {
        if (!active) return;
        const delay = 1000 + Math.random() * 3000;
        const t = setTimeout(() => {
          if (!active) return;
          const now = ctx.currentTime;
          const rustleSrc = ctx.createBufferSource();
          rustleSrc.buffer = makePinkNoise(ctx, 0.5);
          const rustleFilter = ctx.createBiquadFilter();
          rustleFilter.type = "highpass";
          rustleFilter.frequency.value = 3000;
          const rustleGain = ctx.createGain();
          rustleGain.gain.setValueAtTime(0, now);
          rustleGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
          rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          rustleSrc.connect(rustleFilter);
          rustleFilter.connect(rustleGain);
          rustleGain.connect(master);
          rustleSrc.start(now);
          rustleSrc.stop(now + 0.5);
          scheduleLeafRustle();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleLeafRustle();

      cleanups.push(() => {
        active = false;
        try { windSrc.stop(); windSrc.disconnect(); } catch {}
        try { lfo.stop(); lfo.disconnect(); } catch {}
        windBp.disconnect(); windGain.disconnect(); lfoAmp.disconnect();
      });
    }

    // 10. DEEP WIND
    if (id === "wind") {
      const src = ctx.createBufferSource();
      src.buffer = makePinkNoise(ctx, 8);
      src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 100;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.7;
      const lfo1 = ctx.createOscillator();
      lfo1.type = "sine";
      lfo1.frequency.value = 0.03;
      const lfo1Amp = ctx.createGain();
      lfo1Amp.gain.value = 0.4;
      lfo1.connect(lfo1Amp);
      lfo1Amp.connect(gainNode.gain);
      lfo1.start();
      const lfo2 = ctx.createOscillator();
      lfo2.type = "sine";
      lfo2.frequency.value = 0.07;
      const lfo2Amp = ctx.createGain();
      lfo2Amp.gain.value = 0.15;
      lfo2.connect(lfo2Amp);
      lfo2Amp.connect(hp.frequency);
      lfo2.start();
      src.connect(hp);
      hp.connect(lp);
      lp.connect(gainNode);
      gainNode.connect(master);
      src.start();
      cleanups.push(() => {
        try { src.stop(); src.disconnect(); } catch {}
        try { lfo1.stop(); lfo1.disconnect(); } catch {}
        try { lfo2.stop(); lfo2.disconnect(); } catch {}
        hp.disconnect(); lp.disconnect(); gainNode.disconnect();
        lfo1Amp.disconnect(); lfo2Amp.disconnect();
      });
    }

    cleanupRef.current = cleanups;
    setPlaying(id);
  }, [stop, volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setValueAtTime(v, ctxRef.current.currentTime);
    }
  }, []);

  const resumeCtx = useCallback(async () => {
    if (ctxRef.current && ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
  }, []);

  return { playing, play, stop, volume, setVolume, resumeCtx };
}
