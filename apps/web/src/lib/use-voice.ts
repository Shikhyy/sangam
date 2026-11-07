"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type RecognitionLike, recognitionCtor } from "./speech";
import { recordingToWav } from "./wav";

/** Stop a recording a little before Gnani's 30 second limit. */
const MAX_SECONDS = 28;

let configured: Promise<boolean> | null = null;

/** Whether the server has Gnani set up. Asked once, then remembered. */
function gnaniReady(): Promise<boolean> {
  configured ??= fetch("/api/stt")
    .then((response) => response.json() as Promise<{ configured?: boolean }>)
    .then((data) => data.configured === true)
    .catch(() => false);
  return configured;
}

async function messageOf(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

interface VoiceOptions {
  /** Called with what was heard, as text to put in the box. */
  onText: (text: string) => void;
  /** Called with a short message for the person, or null to clear it. */
  onNotice: (message: string | null) => void;
  /** Called with how loud the person is, 0 to 1, while recording. */
  onLevel?: (level: number) => void;
}

/**
 * Speaking and listening. When the server has Gnani set up, the microphone is recorded, converted to
 * WAV and sent to Gnani for the words, and replies are spoken with a Gnani voice. When it does not, the
 * browser's own speech recognition and voice are used so the page still works.
 */
export function useVoice({ onText, onNotice, onLevel }: VoiceOptions) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<RecognitionLike | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<number | null>(null);
  const meter = useRef<{ stop: () => void } | null>(null);

  const cleanup = useCallback(() => {
    if (stopTimer.current !== null) window.clearTimeout(stopTimer.current);
    meter.current?.stop();
    meter.current = null;
  }, []);

  useEffect(
    () => () => {
      cleanup();
      if (recorder.current?.state === "recording") recorder.current.stop();
      recognition.current?.stop();
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    },
    [cleanup],
  );

  const listenWithBrowser = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      onNotice("Speech input isn't supported in this browser. Type instead.");
      return;
    }
    const session = new Ctor();
    session.lang = "hi-IN";
    session.interimResults = true;
    session.continuous = false;
    session.onresult = (event) => {
      const heard = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ");
      onText(heard.trim());
    };
    session.onerror = () => onNotice("The microphone is blocked. Allow it in your browser settings, or type instead.");
    session.onend = () => setListening(false);
    recognition.current = session;
    onNotice(null);
    setListening(true);
    session.start();
  }, [onNotice, onText]);

  const listenWithGnani = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      listenWithBrowser();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onNotice("The microphone is blocked. Allow it in your browser settings, or type instead.");
      return;
    }

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorder.current = rec;
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    // Measure loudness so the page can react while the person talks.
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) sum += ((value - 128) / 128) ** 2;
      onLevel?.(Math.min(1, Math.sqrt(sum / samples.length) * 5));
      raf = requestAnimationFrame(tick);
    };
    tick();
    meter.current = {
      stop: () => {
        cancelAnimationFrame(raf);
        void context.close();
        onLevel?.(0);
      },
    };

    rec.onstop = async () => {
      cleanup();
      for (const track of stream.getTracks()) track.stop();
      setListening(false);
      setTranscribing(true);
      try {
        const { wav, seconds } = await recordingToWav(new Blob(chunks, { type: rec.mimeType }));
        if (seconds < 0.3) {
          onNotice("That was too short to hear. Hold on a little longer.");
          return;
        }
        const form = new FormData();
        form.append("audio", wav, "speech.wav");
        const response = await fetch("/api/stt", { method: "POST", body: form });
        if (!response.ok) {
          onNotice(await messageOf(response, "Couldn't hear that. Try again, or type instead."));
          return;
        }
        const result = (await response.json()) as { text?: string };
        if (result.text) onText(result.text);
        else onNotice("I didn't catch anything. Try again a little closer to the microphone.");
      } catch {
        onNotice("Couldn't process that recording. Try again, or type instead.");
      } finally {
        setTranscribing(false);
      }
    };

    onNotice(null);
    setListening(true);
    rec.start();
    stopTimer.current = window.setTimeout(() => {
      if (rec.state === "recording") rec.stop();
    }, MAX_SECONDS * 1000);
  }, [cleanup, listenWithBrowser, onLevel, onNotice, onText]);

  const toggleMic = useCallback(async () => {
    if (transcribing) return;
    if (listening) {
      if (recorder.current?.state === "recording") recorder.current.stop();
      else recognition.current?.stop();
      return;
    }
    if (await gnaniReady()) await listenWithGnani();
    else listenWithBrowser();
  }, [listenWithBrowser, listenWithGnani, listening, transcribing]);

  const speakWithBrowser = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) {
        onNotice("Speech output isn't supported in this browser.");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "hi-IN";
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [onNotice],
  );

  const play = useCallback(
    async (text: string) => {
      audio.current?.pause();
      window.speechSynthesis?.cancel();
      if (!(await gnaniReady())) {
        speakWithBrowser(text);
        return;
      }

      setSpeaking(true);
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) {
          onNotice(`${await messageOf(response, "Couldn't speak that.")} Using the browser voice instead.`);
          setSpeaking(false);
          speakWithBrowser(text);
          return;
        }
        const url = URL.createObjectURL(await response.blob());
        const element = new Audio(url);
        audio.current = element;
        const done = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
        };
        element.onended = done;
        element.onerror = done;
        await element.play();
      } catch {
        setSpeaking(false);
        onNotice("Couldn't play that. Check your connection and try again.");
      }
    },
    [onNotice, speakWithBrowser],
  );

  return { listening, transcribing, speaking, toggleMic, play };
}
