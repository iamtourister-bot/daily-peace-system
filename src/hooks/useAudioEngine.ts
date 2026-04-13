import { useRef, useCallback, useState, useEffect } from "react";

export type SoundId = "rain" | "thunder" | "ocean" | "forest" | "bowl" | "noise" | "brown" | "fire" | "autumn" | "wind";

// ── NOISE BUFFERS ────────────────────────────────────────────────────────────

function makePinkNoise(ctx: AudioContext, duration = 6): AudioBuffer {
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

function makeBrownNoise(ctx: AudioContext, duration = 6): AudioBuffer {
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

// Deep rumble buffer for thunder / ocean low end
function makeRumble(ctx: AudioContext, duration = 4): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.008 * w) / 1.008;
      data[i] = lastOut * 8.0;
    }
  }
  return buffer;
}

// ── HOOK ─────────────────────────────────────────────────────────────────────

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
        if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
        const buf = ctxRef.current.createBuffer(1, 1, 22050);
        const src = ctxRef.current.createBufferSource();
        src.buffer = buf; src.connect(ctxRef.current.destination); src.start(0); src.disconnect();
      } catch {}
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
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
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

    // ── 1. GENTLE RAIN ───────────────────────────────────────────────────────
    // Sound: layered pink noise shaped through band-pass filters to mimic
    // the hiss of rain + a gentle drip peaking EQ + slow LFO swell
    if (id === "rain") {
      const pinkBuf = makePinkNoise(ctx, 8);

      // Main rain hiss layer
      const hiss = ctx.createBufferSource();
      hiss.buffer = pinkBuf; hiss.loop = true;
      const hissFilter = ctx.createBiquadFilter();
      hissFilter.type = "bandpass"; hissFilter.frequency.value = 2200; hissFilter.Q.value = 0.6;
      const hissGain = ctx.createGain(); hissGain.gain.value = 1.1;

      // Soft low rumble of rain on ground
      const rumbleSrc = ctx.createBufferSource();
      rumbleSrc.buffer = makePinkNoise(ctx, 6); rumbleSrc.loop = true;
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = "lowpass"; rumbleFilter.frequency.value = 400; rumbleFilter.Q.value = 0.3;
      const rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0.4;

      // Slow intensity swell (rain gusts)
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.05;
      const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 0.18;
      lfo.connect(lfoAmp); lfoAmp.connect(hissGain.gain); lfo.start();

      hiss.connect(hissFilter); hissFilter.connect(hissGain); hissGain.connect(master);
      rumbleSrc.connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(master);
      hiss.start(); rumbleSrc.start();

      cleanups.push(() => {
        try { hiss.stop(); hiss.disconnect(); } catch {}
        try { rumbleSrc.stop(); rumbleSrc.disconnect(); } catch {}
        try { lfo.stop(); lfo.disconnect(); } catch {}
        hissFilter.disconnect(); hissGain.disconnect();
        rumbleFilter.disconnect(); rumbleGain.disconnect(); lfoAmp.disconnect();
      });
    }

    // ── 2. RAIN & THUNDER ────────────────────────────────────────────────────
    // Sound: heavier rain (more low-mid), + scheduled thunder events built from
    // very low-frequency brown noise burst + resonant sub rumble
    if (id === "thunder") {
      // Heavy rain — darker than gentle rain
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = makePinkNoise(ctx, 8); rainSrc.loop = true;
      const rainLp = ctx.createBiquadFilter(); rainLp.type = "lowpass"; rainLp.frequency.value = 2800;
      const rainHp = ctx.createBiquadFilter(); rainHp.type = "highpass"; rainHp.frequency.value = 200;
      const rainGain = ctx.createGain(); rainGain.gain.value = 0.95;
      rainSrc.connect(rainLp); rainLp.connect(rainHp); rainHp.connect(rainGain); rainGain.connect(master);
      rainSrc.start();

      let active = true;

      const scheduleThunder = () => {
        if (!active) return;
        const delay = 6000 + Math.random() * 14000;
        const t = setTimeout(() => {
          if (!active) return;
          const now = ctx.currentTime;

          // Initial crack — sharp bandpass burst
          const crackBuf = makeWhiteNoise(ctx, 0.15);
          const crackSrc = ctx.createBufferSource(); crackSrc.buffer = crackBuf;
          const crackBp = ctx.createBiquadFilter(); crackBp.type = "bandpass";
          crackBp.frequency.value = 120; crackBp.Q.value = 0.5;
          const crackGain = ctx.createGain();
          crackGain.gain.setValueAtTime(0, now);
          crackGain.gain.linearRampToValueAtTime(2.2, now + 0.04);
          crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          crackSrc.connect(crackBp); crackBp.connect(crackGain); crackGain.connect(master);
          crackSrc.start(now); crackSrc.stop(now + 0.2);

          // Long rolling rumble — very low brown noise
          const rumbleBuf = makeRumble(ctx, 4);
          const rumbleSrc = ctx.createBufferSource(); rumbleSrc.buffer = rumbleBuf;
          const rumbleLp = ctx.createBiquadFilter(); rumbleLp.type = "lowpass"; rumbleLp.frequency.value = 160;
          const rumbleGain = ctx.createGain();
          rumbleGain.gain.setValueAtTime(0, now + 0.02);
          rumbleGain.gain.linearRampToValueAtTime(1.8, now + 0.3);
          rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
          rumbleSrc.connect(rumbleLp); rumbleLp.connect(rumbleGain); rumbleGain.connect(master);
          rumbleSrc.start(now + 0.02); rumbleSrc.stop(now + 5);

          scheduleThunder();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleThunder();

      cleanups.push(() => {
        active = false;
        try { rainSrc.stop(); rainSrc.disconnect(); } catch {}
        rainLp.disconnect(); rainHp.disconnect(); rainGain.disconnect();
      });
    }

    // ── 3. OCEAN WAVES ───────────────────────────────────────────────────────
    // Sound: deep brown-noise base shaped to ocean spectrum + very slow LFO
    // (0.06 Hz = ~17s wave period) for authentic surge and retreat,
    // plus gentle high-frequency surf spray layer
    if (id === "ocean") {
      // Deep wave body — brown noise shaped
      const waveBuf = makeBrownNoise(ctx, 10);
      const waveSrc = ctx.createBufferSource(); waveSrc.buffer = waveBuf; waveSrc.loop = true;
      const waveLp = ctx.createBiquadFilter(); waveLp.type = "lowpass"; waveLp.frequency.value = 800;
      const waveHp = ctx.createBiquadFilter(); waveHp.type = "highpass"; waveHp.frequency.value = 40;
      const waveGain = ctx.createGain(); waveGain.gain.value = 0.55;

      // Wave surge LFO — very slow, like a real wave
      const surgeLfo = ctx.createOscillator(); surgeLfo.type = "sine"; surgeLfo.frequency.value = 0.055;
      const surgeAmp = ctx.createGain(); surgeAmp.gain.value = 0.42;
      surgeLfo.connect(surgeAmp); surgeAmp.connect(waveGain.gain); surgeLfo.start();

      // Second wave out of phase — overlapping waves
      const wave2Src = ctx.createBufferSource(); wave2Src.buffer = makeBrownNoise(ctx, 8); wave2Src.loop = true;
      const wave2Lp = ctx.createBiquadFilter(); wave2Lp.type = "lowpass"; wave2Lp.frequency.value = 600;
      const wave2Gain = ctx.createGain(); wave2Gain.gain.value = 0.3;
      const surge2Lfo = ctx.createOscillator(); surge2Lfo.type = "sine"; surge2Lfo.frequency.value = 0.045;
      const surge2Amp = ctx.createGain(); surge2Amp.gain.value = 0.28;
      surge2Lfo.connect(surge2Amp); surge2Amp.connect(wave2Gain.gain); surge2Lfo.start();

      // Surf spray — high-passed pink noise, very quiet
      const spraySrc = ctx.createBufferSource(); spraySrc.buffer = makePinkNoise(ctx, 6); spraySrc.loop = true;
      const sprayHp = ctx.createBiquadFilter(); sprayHp.type = "highpass"; sprayHp.frequency.value = 3500;
      const sprayGain = ctx.createGain(); sprayGain.gain.value = 0.12;

      waveSrc.connect(waveLp); waveLp.connect(waveHp); waveHp.connect(waveGain); waveGain.connect(master);
      wave2Src.connect(wave2Lp); wave2Lp.connect(wave2Gain); wave2Gain.connect(master);
      spraySrc.connect(sprayHp); sprayHp.connect(sprayGain); sprayGain.connect(master);
      waveSrc.start(); wave2Src.start(); spraySrc.start();

      cleanups.push(() => {
        try { waveSrc.stop(); waveSrc.disconnect(); } catch {}
        try { wave2Src.stop(); wave2Src.disconnect(); } catch {}
        try { spraySrc.stop(); spraySrc.disconnect(); } catch {}
        try { surgeLfo.stop(); surgeLfo.disconnect(); } catch {}
        try { surge2Lfo.stop(); surge2Lfo.disconnect(); } catch {}
        waveLp.disconnect(); waveHp.disconnect(); waveGain.disconnect();
        wave2Lp.disconnect(); wave2Gain.disconnect();
        sprayHp.disconnect(); sprayGain.disconnect();
        surgeAmp.disconnect(); surge2Amp.disconnect();
      });
    }

    // ── 4. FOREST BIRDS ──────────────────────────────────────────────────────
    // Sound: gentle wind through trees (band-passed pink noise) + scheduled
    // bird calls (FM synthesis with chirp glide) + leaves rustle (high-passed bursts)
    if (id === "forest") {
      // Wind through leaves
      const windSrc = ctx.createBufferSource(); windSrc.buffer = makePinkNoise(ctx, 8); windSrc.loop = true;
      const windBp = ctx.createBiquadFilter(); windBp.type = "bandpass"; windBp.frequency.value = 700; windBp.Q.value = 0.5;
      const windGain = ctx.createGain(); windGain.gain.value = 0.22;
      const windLfo = ctx.createOscillator(); windLfo.type = "sine"; windLfo.frequency.value = 0.04;
      const windLfoAmp = ctx.createGain(); windLfoAmp.gain.value = 0.1;
      windLfo.connect(windLfoAmp); windLfoAmp.connect(windGain.gain); windLfo.start();
      windSrc.connect(windBp); windBp.connect(windGain); windGain.connect(master); windSrc.start();

      let active = true;

      // Bird song — FM chirp with frequency glide
      const scheduleChirp = () => {
        if (!active) return;
        const delay = 800 + Math.random() * 5000;
        const t = setTimeout(() => {
          if (!active) return;
          const now = ctx.currentTime;
          const baseFreq = 1400 + Math.random() * 2000;

          // Carrier
          const carrier = ctx.createOscillator(); carrier.type = "sine";
          carrier.frequency.setValueAtTime(baseFreq, now);
          carrier.frequency.linearRampToValueAtTime(baseFreq * (1.15 + Math.random() * 0.3), now + 0.08);
          carrier.frequency.linearRampToValueAtTime(baseFreq * 0.95, now + 0.2);

          // Modulator for FM warmth
          const mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = baseFreq * 2.1;
          const modGain = ctx.createGain(); modGain.gain.value = baseFreq * 0.4;
          mod.connect(modGain); modGain.connect(carrier.frequency);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0, now);
          env.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.04, now + 0.03);
          env.gain.setValueAtTime(0.06 + Math.random() * 0.04, now + 0.12);
          env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          carrier.connect(env); env.connect(master);
          carrier.start(now); mod.start(now); carrier.stop(now + 0.4); mod.stop(now + 0.4);

          // Sometimes a second answering chirp
          if (Math.random() > 0.5) {
            const t2 = setTimeout(() => {
              if (!active) return;
              const n2 = ctx.currentTime;
              const f2 = baseFreq * (0.85 + Math.random() * 0.3);
              const c2 = ctx.createOscillator(); c2.type = "sine";
              c2.frequency.setValueAtTime(f2, n2); c2.frequency.linearRampToValueAtTime(f2 * 1.1, n2 + 0.1);
              const e2 = ctx.createGain();
              e2.gain.setValueAtTime(0, n2); e2.gain.linearRampToValueAtTime(0.05, n2 + 0.04);
              e2.gain.exponentialRampToValueAtTime(0.001, n2 + 0.3);
              c2.connect(e2); e2.connect(master); c2.start(n2); c2.stop(n2 + 0.35);
            }, 300 + Math.random() * 500);
            cleanups.push(() => clearTimeout(t2));
          }

          scheduleChirp();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleChirp();

      cleanups.push(() => {
        active = false;
        try { windSrc.stop(); windSrc.disconnect(); } catch {}
        try { windLfo.stop(); windLfo.disconnect(); } catch {}
        windBp.disconnect(); windGain.disconnect(); windLfoAmp.disconnect();
      });
    }

    // ── 5. TIBETAN BOWL ──────────────────────────────────────────────────────
    // Sound: three sine oscillators at authentic bowl harmonics (1x, 2.76x, 5.41x)
    // with slow exponential decay, repeated on an interval
    if (id === "bowl") {
      let active = true;
      const playBowl = () => {
        if (!active) return;
        const now = ctx.currentTime;
        const freq = 432;

        const osc1 = ctx.createOscillator(); osc1.type = "sine"; osc1.frequency.value = freq;
        const osc2 = ctx.createOscillator(); osc2.type = "sine"; osc2.frequency.value = freq * 2.756;
        const osc3 = ctx.createOscillator(); osc3.type = "sine"; osc3.frequency.value = freq * 5.404;
        // Subtle shimmer — slight frequency wobble
        const shimmerLfo = ctx.createOscillator(); shimmerLfo.type = "sine"; shimmerLfo.frequency.value = 5.8;
        const shimmerAmp = ctx.createGain(); shimmerAmp.gain.value = 1.2;
        shimmerLfo.connect(shimmerAmp); shimmerAmp.connect(osc1.frequency); shimmerLfo.start(now);

        const g1 = ctx.createGain(); g1.gain.setValueAtTime(0.52, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 10);
        const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.16, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 7.5);
        const g3 = ctx.createGain(); g3.gain.setValueAtTime(0.05, now); g3.gain.exponentialRampToValueAtTime(0.001, now + 5);

        osc1.connect(g1); g1.connect(master);
        osc2.connect(g2); g2.connect(master);
        osc3.connect(g3); g3.connect(master);
        osc1.start(now); osc2.start(now); osc3.start(now);
        osc1.stop(now + 11); osc2.stop(now + 11); osc3.stop(now + 11);
        shimmerLfo.stop(now + 11);
      };
      playBowl();
      const interval = setInterval(() => { if (active) playBowl(); }, 12000);
      cleanups.push(() => { active = false; clearInterval(interval); });
    }

    // ── 6. WHITE NOISE ───────────────────────────────────────────────────────
    // Sound: spectrally flat white noise, high-passed to remove sub rumble,
    // low-passed to remove harsh ultra-highs — clean, consistent focus sound
    if (id === "noise") {
      const src = ctx.createBufferSource(); src.buffer = makeWhiteNoise(ctx, 6); src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 10000;
      const gainNode = ctx.createGain(); gainNode.gain.value = 0.85;
      src.connect(hp); hp.connect(lp); lp.connect(gainNode); gainNode.connect(master); src.start();
      cleanups.push(() => {
        try { src.stop(); src.disconnect(); } catch {}
        hp.disconnect(); lp.disconnect(); gainNode.disconnect();
      });
    }

    // ── 7. BROWN NOISE ───────────────────────────────────────────────────────
    // Sound: deeper, richer than white noise — emphasises bass frequencies.
    // Like standing near a waterfall. No LFO, just steady low rumble.
    if (id === "brown") {
      const src = ctx.createBufferSource(); src.buffer = makeBrownNoise(ctx, 8); src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 20;
      const gainNode = ctx.createGain(); gainNode.gain.value = 0.82;
      src.connect(lp); lp.connect(hp); hp.connect(gainNode); gainNode.connect(master); src.start();
      cleanups.push(() => {
        try { src.stop(); src.disconnect(); } catch {}
        lp.disconnect(); hp.disconnect(); gainNode.disconnect();
      });
    }

    // ── 8. FIREPLACE ─────────────────────────────────────────────────────────
    // Sound: warm pink noise base (fire roar) + slow LFO for fire breathing +
    // scheduled random crackles (sharp band-passed white noise bursts)
  if (id === "fire") {
  // Warm mid-range fire roar — higher frequency than ocean
  const roarSrc = ctx.createBufferSource();
  roarSrc.buffer = makePinkNoise(ctx, 6);
  roarSrc.loop = true;
  const roarBp = ctx.createBiquadFilter();
  roarBp.type = "bandpass";
  roarBp.frequency.value = 800;
  roarBp.Q.value = 0.5;
  const roarGain = ctx.createGain();
  roarGain.gain.value = 0.5;
  roarSrc.connect(roarBp);
  roarBp.connect(roarGain);
  roarGain.connect(master);
  roarSrc.start();

  // High crackle layer
  const crackSrc = ctx.createBufferSource();
  crackSrc.buffer = makePinkNoise(ctx, 4);
  crackSrc.loop = true;
  const crackHp = ctx.createBiquadFilter();
  crackHp.type = "highpass";
  crackHp.frequency.value = 3000;
  const crackGain = ctx.createGain();
  crackGain.gain.value = 0.2;
  crackSrc.connect(crackHp);
  crackHp.connect(crackGain);
  crackGain.connect(master);
  crackSrc.start();

  // Fast irregular fire flicker LFO
  const flickerLfo = ctx.createOscillator();
  flickerLfo.type = "sawtooth";
  flickerLfo.frequency.value = 8;
  const flickerAmp = ctx.createGain();
  flickerAmp.gain.value = 0.15;
  flickerLfo.connect(flickerAmp);
  flickerAmp.connect(roarGain.gain);
  flickerLfo.start();

  // Sharp wood crackles and pops
  let active = true;
  const scheduleCrackle = () => {
    if (!active) return;
    const delay = 150 + Math.random() * 1200;
    const t = setTimeout(() => {
      if (!active) return;
      const now = ctx.currentTime;
      const isBigPop = Math.random() > 0.65;
      if (isBigPop) {
        const popBuf = makeWhiteNoise(ctx, 0.05);
        const pop = ctx.createBufferSource();
        pop.buffer = popBuf;
        const popBp = ctx.createBiquadFilter();
        popBp.type = "bandpass";
        popBp.frequency.value = 600 + Math.random() * 400;
        popBp.Q.value = 3;
        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(1.2, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        pop.connect(popBp); popBp.connect(popGain); popGain.connect(master);
        pop.start(now); pop.stop(now + 0.12);
      } else {
        const crkBuf = makeWhiteNoise(ctx, 0.02);
        const crk = ctx.createBufferSource();
        crk.buffer = crkBuf;
        const crkBp = ctx.createBiquadFilter();
        crkBp.type = "bandpass";
        crkBp.frequency.value = 3000 + Math.random() * 6000;
        crkBp.Q.value = 15;
        const crkGain = ctx.createGain();
        crkGain.gain.setValueAtTime(0.5 + Math.random() * 0.5, now);
        crkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        crk.connect(crkBp); crkBp.connect(crkGain); crkGain.connect(master);
        crk.start(now); crk.stop(now + 0.05);
      }
      scheduleCrackle();
    }, delay);
    cleanups.push(() => clearTimeout(t));
  };
  scheduleCrackle();

  cleanups.push(() => {
    active = false;
    try { roarSrc.stop(); roarSrc.disconnect(); } catch {}
    try { crackSrc.stop(); crackSrc.disconnect(); } catch {}
    try { flickerLfo.stop(); flickerLfo.disconnect(); } catch {}
    roarBp.disconnect(); roarGain.disconnect();
    crackHp.disconnect(); crackGain.disconnect();
    flickerAmp.disconnect();
  });
}
    // ── 9. AUTUMN WIND ───────────────────────────────────────────────────────
    // Sound: medium-frequency band-passed pink noise for wind tone + slow
    // swelling LFO + high-frequency leaf rustle bursts
    if (id === "autumn") {
      const windSrc = ctx.createBufferSource(); windSrc.buffer = makePinkNoise(ctx, 8); windSrc.loop = true;
      const windBp = ctx.createBiquadFilter(); windBp.type = "bandpass"; windBp.frequency.value = 900; windBp.Q.value = 0.35;
      const windGain = ctx.createGain(); windGain.gain.value = 0.48;
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.048;
      const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 0.32;
      lfo.connect(lfoAmp); lfoAmp.connect(windGain.gain); lfo.start();
      windSrc.connect(windBp); windBp.connect(windGain); windGain.connect(master); windSrc.start();

      let active = true;
      const scheduleRustle = () => {
        if (!active) return;
        const delay = 600 + Math.random() * 2800;
        const t = setTimeout(() => {
          if (!active) return;
          const now = ctx.currentTime;
          const rustleSrc = ctx.createBufferSource(); rustleSrc.buffer = makePinkNoise(ctx, 0.6);
          const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;
          const rustleGain = ctx.createGain();
          rustleGain.gain.setValueAtTime(0, now);
          rustleGain.gain.linearRampToValueAtTime(0.12, now + 0.08);
          rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          rustleSrc.connect(hp); hp.connect(rustleGain); rustleGain.connect(master);
          rustleSrc.start(now); rustleSrc.stop(now + 0.6);
          scheduleRustle();
        }, delay);
        cleanups.push(() => clearTimeout(t));
      };
      scheduleRustle();

      cleanups.push(() => {
        active = false;
        try { windSrc.stop(); windSrc.disconnect(); } catch {}
        try { lfo.stop(); lfo.disconnect(); } catch {}
        windBp.disconnect(); windGain.disconnect(); lfoAmp.disconnect();
      });
    }

    // ── 10. DEEP WIND ────────────────────────────────────────────────────────
    // Sound: very low-frequency pink noise shaped to give open howling wind —
    // two LFOs (one slow swell, one medium frequency modulation) give the
    // impression of wind across a vast exposed space
    if (id === "wind") {
      const src = ctx.createBufferSource(); src.buffer = makePinkNoise(ctx, 10); src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
      const mid = ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 250; mid.gain.value = 6;
      const gainNode = ctx.createGain(); gainNode.gain.value = 0.65;

      // Slow howl swell
      const lfo1 = ctx.createOscillator(); lfo1.type = "sine"; lfo1.frequency.value = 0.025;
      const lfo1Amp = ctx.createGain(); lfo1Amp.gain.value = 0.38;
      lfo1.connect(lfo1Amp); lfo1Amp.connect(gainNode.gain); lfo1.start();

      // Medium-rate tone wobble on the low-pass cutoff
      const lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.08;
      const lfo2Amp = ctx.createGain(); lfo2Amp.gain.value = 120;
      lfo2.connect(lfo2Amp); lfo2Amp.connect(lp.frequency); lfo2.start();

      src.connect(hp); hp.connect(mid); mid.connect(lp); lp.connect(gainNode); gainNode.connect(master); src.start();

      cleanups.push(() => {
        try { src.stop(); src.disconnect(); } catch {}
        try { lfo1.stop(); lfo1.disconnect(); } catch {}
        try { lfo2.stop(); lfo2.disconnect(); } catch {}
        hp.disconnect(); lp.disconnect(); mid.disconnect(); gainNode.disconnect();
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
