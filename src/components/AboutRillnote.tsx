export function AboutRillnote() {
  return (
    <details className="about-disclosure">
      <summary>About Rillnote</summary>
      <div className="about-content">
        <section>
          <h2>Flow past office chatter.</h2>
          <p>Rillnote generates layered water soundscapes designed to soften nearby conversation while flexible timers and Pomodoro sessions keep work moving.</p>
        </section>
        <section>
          <h2>What does “rill” mean?</h2>
          <p>A rill is a small stream or shallow channel shaped by running water—a quiet current that inspired the name Rillnote.</p>
        </section>
        <section>
          <h2>Private by design.</h2>
          <p>Your preferences and active session stay in this browser. Rillnote has no accounts, cloud sync, or analytics configured.</p>
        </section>
        <section>
          <h2>Generated, not streamed.</h2>
          <p>The water textures and optional binaural layer are synthesized on your device. No audio files or session details are uploaded.</p>
        </section>
        <section>
          <h2>Can I use it offline?</h2>
          <p>Yes. Install Rillnote from a supported browser and it will remain available without a connection after its first successful load.</p>
        </section>
        <section>
          <h2>Does it cost anything?</h2>
          <p>No. Rillnote is a free focus tool.</p>
        </section>
        <p className="feedback-link">Ideas or feedback? <a href="mailto:info@2ndbell.com">Email info@2ndbell.com</a>.</p>
      </div>
    </details>
  );
}
