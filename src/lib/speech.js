// KAVACH AI — Voice I/O helper (Web Speech API).
//
// Provides bilingual (English + Kannada) speech-to-text input and
// text-to-speech output for the Copilot, per the KSP Datathon 2026
// "voice-enabled interaction" requirement. Uses the browser-native
// SpeechRecognition / SpeechSynthesis APIs — zero external API key
// dependency, works entirely client-side, gracefully degrades (buttons
// hide) on unsupported browsers instead of throwing.

const SpeechRecognitionCtor = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export const isVoiceInputSupported = () => !!SpeechRecognitionCtor;
export const isVoiceOutputSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function startListening({ lang = 'en-IN', onResult, onError, onEnd }) {
  if (!SpeechRecognitionCtor) {
    onError?.('Voice input is not supported in this browser.');
    return null;
  }
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult?.(transcript);
  };
  recognition.onerror = (event) => onError?.(event.error || 'Voice recognition error');
  recognition.onend = () => onEnd?.();

  recognition.start();
  return recognition;
}

export function speak(text, lang = 'en') {
  if (!isVoiceOutputSupported() || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
  utterance.rate = 0.98;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isVoiceOutputSupported()) window.speechSynthesis.cancel();
}
