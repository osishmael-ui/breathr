export function AboutBreathr() {
  return (
    <details className="about-disclosure">
      <summary>About Breathr</summary>
      <div className="about-content">
        <section>
          <h2>Come back to yourself.</h2>
          <p>Breathr pairs simple breathing rhythms with calming 2ndBell soundtracks to create a small, repeatable space for settling down.</p>
        </section>
        <section>
          <h2>How does it work?</h2>
          <p>Choose a breathing pattern, start a session, and follow the expanding and softening orb. The pace is a gentle prompt, not a test to perform perfectly.</p>
        </section>
        <section>
          <h2>Private by design.</h2>
          <p>Your preferences and active session stay in this browser. Breathr has no accounts, cloud sync, or analytics configured.</p>
        </section>
        <section>
          <h2>Real recordings, kept local.</h2>
          <p>Breathr plays the supplied 2ndBell recordings from the app bundle. No audio or session details are uploaded.</p>
        </section>
        <section>
          <h2>Can I use it offline?</h2>
          <p>Yes. Install Breathr from a supported browser and it will remain available without a connection after its first successful load.</p>
        </section>
        <section>
          <h2>Does it cost anything?</h2>
          <p>No. Breathr is a free relaxation tool.</p>
        </section>
        <section>
          <h2>Part of 2nd Bell.</h2>
          <p>Breathr is part of the <a href="https://www.2ndbell.com">2nd Bell</a> family of apps.</p>
        </section>
        <p className="feedback-link">Ideas or feedback? <a href="mailto:info@2ndbell.com">Email info@2ndbell.com</a>.</p>
        <p className="about-copyright">© {new Date().getFullYear()} <a href="https://www.2ndbell.com">2nd Bell</a> and Os Ishmael.</p>
      </div>
    </details>
  );
}
