import { Pause, Play, RotateCcw, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import type { AccompanimentState } from "../audio/AccompanimentPlayer";

type AudioImportProps = {
  state: AccompanimentState;
  onImport: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onVolume: (volume: number) => void;
};

export function AudioImport({ state, onImport, onPlay, onPause, onRestart, onVolume }: AudioImportProps) {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <aside className="audio-import" aria-label="Accompaniment controls">
      <label className="import-button">
        <Upload size={14} strokeWidth={1.7} />
        IMPORT AUDIO
        <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a" onChange={handleFile} />
      </label>
      {state.fileName && (
        <div className="now-playing">
          <span>NOW PLAYING</span>
          <strong>{state.fileName}</strong>
          <div className="transport">
            <button type="button" onClick={state.isPlaying ? onPause : onPlay} aria-label={state.isPlaying ? "Pause" : "Play"}>
              {state.isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button type="button" onClick={onRestart} aria-label="Restart">
              <RotateCcw size={15} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={(event) => onVolume(Number(event.target.value))}
              aria-label="Accompaniment volume"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
