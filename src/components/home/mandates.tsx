import { MANDATES, SECTORS } from "./content";
import { MeetingsCard, MemoCard, PipelineCard, Tilt } from "./mandate-visuals";

const VISUAL = {
  pipeline: PipelineCard,
  meetings: MeetingsCard,
  memo: MemoCard,
} as const;

export function Mandates() {
  return (
    <section className="work" id="work">
      <div className="wrap">
        <p className="eyebrow reveal">Selected mandates</p>
        <h2 className="display reveal-lines">
          <span className="line-mask">
            <span className="line">We raise the rounds</span>
          </span>
          <span className="line-mask">
            <span className="line">worth raising.</span>
          </span>
        </h2>
        <p className="intro reveal">
          We don’t start with a list of investors. We start with your business — what’s working, what isn’t yet, and who is
          actually writing cheques for it right now.
        </p>
      </div>

      <div className="marquee reveal" aria-label="Sectors we work in">
        <p className="marquee-label">Working with founders in</p>
        <div className="marquee-track">
          {SECTORS.map((s) => (
            <span key={s}>{s}</span>
          ))}
          {SECTORS.map((s) => (
            <span key={`${s}-dup`} aria-hidden="true">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="wrap mandates">
        {MANDATES.map((m) => {
          const Visual = VISUAL[m.visual];
          return (
            <article className="mandate reveal" key={m.title}>
              <div className="mandate-copy">
                <h3 className="display-sm">{m.title}</h3>
                <p className="lede">
                  {m.lede[0]}
                  <b>{m.lede[1]}</b>
                  {m.lede[2]}
                </p>
                <a href="#contact" className="arrow-link">
                  How we’d run yours <span aria-hidden="true">→</span>
                </a>
              </div>
              <Tilt>
                <Visual />
              </Tilt>
            </article>
          );
        })}

        <a href="#contact" className="btn btn-navy reveal">
          Talk to us about your round <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
