import { useEffect, useRef } from 'react';
import { arcanaDemo } from '../arcana-demo';
import './arcana-fonts.css';
import './arcana-spiral';
import { prefersStillness } from './phoenix-sparks';
import './arcana-card.css';

const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' });

/** The demo recording. It plays muted and looping unless the visitor prefers stillness, then rests on its poster. */
export function ArcanaDemoVideo({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!prefersStillness()) void video.current?.play().catch(() => undefined);
  }, []);
  return (
    <video ref={video} className={className} muted loop playsInline preload="metadata"
      poster={arcanaDemo.video.poster} aria-label={`Arcana replaying a trading backtest on ${arcanaDemo.market}`}>
      <source src={arcanaDemo.video.mp4} type="video/mp4" />
    </video>
  );
}

/** The featured hypothesis leads, as an exchange card leads with its headline market. */
const featured = arcanaDemo.hypotheses[0];
const direction = (value: number) => (value > 0 ? 'yes' : value < 0 ? 'no' : undefined);

/** The House of Arcana as an exchange market card in Arcana's own dress: a headline number over the replay. */
export function ArcanaCard() {
  return (
    <section id="house-of-arcana" className="arcana-card-section" aria-label="The House of Arcana">
      <a className="arcana-card" href={arcanaDemo.route}>
        <arcana-spiral className="arcana-card__spiral" aria-hidden="true" />
        <header className="arcana-card__header">
          <span className="arcana-card__ticker">{arcanaDemo.market}</span>
          <span className="arcana-card__live"><span aria-hidden="true" />Live replay</span>
        </header>
        <h2 className="arcana-card__title">
          <span className="arcana-card__title-lead">The House of</span>
          <span className="arcana-card__title-mark">Arcana</span>
        </h2>
        <p className="arcana-card__tagline">Automated trading platform on Kalshi</p>
        {featured && (
          <p className="arcana-card__headline">
            <span className="arcana-card__headline-value" data-direction={direction(featured.netReturn)}>
              {percent.format(featured.netReturn)}
            </span>
            <span className="arcana-card__headline-label">backtest net return · {featured.thesis}</span>
          </p>
        )}
        <ArcanaDemoVideo className="arcana-card__video" />
        <footer className="arcana-card__footer">
          <span className="arcana-card__open">Open the house <span aria-hidden="true">→</span></span>
        </footer>
      </a>
    </section>
  );
}
