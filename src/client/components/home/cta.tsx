import { SITE } from "@/client/components/site/site-config";
import { CTA } from "./content";

export function Cta() {
  const href = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(CTA.mailSubject)}`;
  return (
    <section className="cta" id="contact">
      <div className="wrap center">
        <h2 className="display reveal-lines">
          <span className="line-mask">
            <span className="line">{CTA.headline[0]}</span>
          </span>
          <span className="line-mask">
            <span className="line">{CTA.headline[1]}</span>
          </span>
        </h2>
        <p className="intro reveal">{CTA.sub}</p>
        <a href={href} className="btn btn-accent reveal">
          Start your raise <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
