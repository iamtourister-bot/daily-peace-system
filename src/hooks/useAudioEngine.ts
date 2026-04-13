import { useRef, useCallback, useState } from "react";

export type SoundId = "rain" | "ocean" | "forest" | "bowl" | "noise";

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

 const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const stop = useCallback(() => {
    cleanupRef.current.forEach(fn => { try { fn(); } catch {} });
    cleanupRef.current = [];
    masterGainRef.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback((id: SoundId) => {
    stop();
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const cleanups: (() => void)[] = [() => { master.disconnect(); }];

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

      cleanups.push(() => {
        active = false;
        clearInterval(interval);
      });
    }

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

    cleanupRef.current = cleanups;
    setPlaying(id);
  }, [stop, volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setValueAtTime(v, ctxRef.current.currentTime);
    }
  }, []);

  return { playing, play, stop, volume, setVolume };
}
