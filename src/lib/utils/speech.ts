// Web Speech API wrapper for real-time speech-to-text

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

type SpeechCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (error: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SpeechRecognitionClass: any = null;

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return !!SpeechRecognitionClass;
}

export function createSpeechRecognition(
  onResult: SpeechCallback,
  onError: ErrorCallback,
  onEnd: () => void
) {
  if (!isSpeechSupported()) {
    onError("Speech recognition is not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; [key: number]: { transcript: string } } } }) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      onResult({ transcript: finalTranscript, isFinal: true });
    }
    if (interimTranscript) {
      onResult({ transcript: interimTranscript, isFinal: false });
    }
  };

  recognition.onerror = (event: { error: string }) => {
    if (event.error !== "aborted") {
      onError(event.error);
    }
  };

  recognition.onend = onEnd;

  return recognition;
}
