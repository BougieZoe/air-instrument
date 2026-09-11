type StartScreenProps = {
  onStart: () => void;
  error: string | null;
  starting: boolean;
};

export function StartScreen({ onStart, error, starting }: StartScreenProps) {
  return (
    <main className="start-screen">
      <div className="start-panel">
        <p className="privacy-copy">Camera processing stays on your device.</p>
        <h1>AIR INSTRUMENT</h1>
        <p className="tagline">Play the air.</p>
        <button type="button" onClick={onStart} disabled={starting}>
          {starting ? "STARTING" : "START"}
        </button>
        {error && <p className="start-error">{error}</p>}
      </div>
    </main>
  );
}
