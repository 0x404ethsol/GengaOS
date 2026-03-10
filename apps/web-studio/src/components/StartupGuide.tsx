interface StartupGuideProps {
  onStart: (templateId: string) => void;
}

const startupSteps = [
  "1. Write a one-line scene beat.",
  "2. Cast and lock your actor identity.",
  "3. Block camera and pose on the virtual set.",
  "4. Shoot keyframes and build in-betweens.",
  "5. Cut and export the first animatic pass."
];

export function StartupGuide({ onStart }: StartupGuideProps) {
  return (
    <section className="panel-block">
      <h2>First 60 Seconds</h2>
      <p className="muted">Launch from idea to first animatic pass with one guided flow.</p>
      <div className="startup-steps">
        {startupSteps.map((step) => (
          <p key={step} className="muted">{step}</p>
        ))}
      </div>
      <div className="row-buttons">
        <button type="button" onClick={() => onStart("sakuga-impact-cut")}>Start Impact Scene</button>
        <button type="button" className="ghost-button" onClick={() => onStart("anime-dialog-closeup")}>
          Start Dialog Scene
        </button>
      </div>
    </section>
  );
}
