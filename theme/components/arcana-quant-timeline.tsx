import { arcanaQuantSteps, type ArcanaQuantMedia } from '../arcana-quant';
import { ArcanaDemoVideo } from './arcana-card';
import { arcanaOrdinal } from './arcana-ordinal';
import './arcana-quant-timeline.css';

function StepMedia({ media }: { media: ArcanaQuantMedia }) {
  return media.kind === 'video' ? (
    <ArcanaDemoVideo className="arcana-quant__media" src={media.src} poster={media.poster} label={media.label}
      playLabel={`Play: ${media.label}`} />
  ) : (
    <img className="arcana-quant__media" src={media.src} alt={media.alt} width={1280} height={720} loading="lazy"
      decoding="async" />
  );
}

/** The research pipeline as a vertical timeline: one node per step, each with Arcana's own screen, then the exits. */
export function ArcanaQuantTimeline() {
  return (
    <div className="arcana-quant">
      <ol className="arcana-quant__steps">
        {arcanaQuantSteps.map((step, i) => (
          <li key={step.name} className="arcana-quant__step">
            <span className="arcana-quant__node" aria-hidden="true">{arcanaOrdinal(i)}</span>
            <div className="arcana-quant__text">
              <h3 className="arcana-quant__name">{step.name}</h3>
              <p>{step.text}</p>
            </div>
            <figure className="arcana-quant__figure">
              <StepMedia media={step.media} />
              {step.caption && <figcaption className="arcana-quant__caption">{step.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ol>
      <div className="arcana-quant__end">
        <span className="arcana-quant__node arcana-quant__node--end" aria-hidden="true" />
        <p className="arcana-quant__exit">
          <span className="arcana-kicker">Exit</span>
          <span>Every step can conclude <em>insufficient evidence</em> or <em>do not trade</em>.</span>
        </p>
        <p className="arcana-quant__next">
          <span className="arcana-kicker">Then</span>
          <span>Paper trading. Not live yet.</span>
        </p>
      </div>
    </div>
  );
}
