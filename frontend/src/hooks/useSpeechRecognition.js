import { useCallback, useEffect, useRef, useState } from "react";

const getCtor = () =>
  typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null;

const ERROR_TEXT = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings and try again.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser settings and try again.",
  "no-speech": "I didn't hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found.",
  network: "Voice needs an internet connection. Check it and try again.",
};

// Wraps the browser's built-in speech recognition (free, no API key). The
// audio is processed by the browser vendor's speech service, not by us.
export default function useSpeechRecognition(lang) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const supported = !!getCtor();

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      setTranscript(text.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERROR_TEXT[e.error] || "Couldn't use the microphone. Try again.");
    };
    rec.onend = () => setListening(false);

    setTranscript("");
    setError("");
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Try again.");
    }
  }, [lang]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, transcript, error, start, stop };
}