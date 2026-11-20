import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { arcanaDemo } from '../arcana-demo';
import './arcana-fonts.css';
import './arcana-spiral';
import { prefersStillness } from './phoenix-sparks';
import './arcana-card.css';

const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' });

/** How long an autoplay attempt may stay silent before the visitor is offered the play button instead. */
const AUTOPLAY_GRACE_MS = 2500;

/**
 * The demo recording, muted and looping. It autoplays unless the visitor prefers stillness. Whenever it is not
 * playing — reduced motion, autoplay refused (iOS Low Power Mode, data saver) or still loading past the grace
 * period — a play button over the poster starts it, since a tap always permits playback. Offscreen, it pauses.
 */
export function ArcanaDemoVideo({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  // Whether the recording should be running: autoplay was allowed, or the visitor pressed play.
  const wanted = useRef(false);
  const [playing, setPlaying] = useState(false);
  // Until the autoplay attempt settles, the poster rests without a button, so an autoplaying video never flashes one.
  const [settling, setSettling] = useState(true);

  const start = (element: HTMLVideoElement) => {
    // iOS only plays inline without a gesture when these are set as properties, not merely as React props.
    element.muted = true;
    element.defaultMuted = true;
    element.playsInline = true;
    element.setAttribute('muted', '');
    element.setAttribute('playsinline', '');
    element.setAttribute('webkit-playsinline', '');
    const grace = window.setTimeout(() => setSettling(false), AUTOPLAY_GRACE_MS);
    setSettling(true);
    element.play().then(
      () => window.clearTimeout(grace),
      () => {
        window.clearTimeout(grace);
        setSettling(false);
      },
    );
  };

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const onPlaying = () => {
      setPlaying(true);
      setSettling(false);
    };
    const onPause = () => setPlaying(false);
    element.addEventListener('playing', onPlaying);
    element.addEventListener('pause', onPause);

    // No autoplay attribute: it would start the recording before this check, and offscreen.
    if (prefersStillness()) setSettling(false);
    else wanted.current = true;

    // On screen, the recording runs if it is meant to (autoplay starts here); offscreen, it rests to save battery.
    const watcher = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (!entry.isIntersecting) {
        if (!element.paused) element.pause();
      } else if (wanted.current && element.paused) start(element);
    });
    watcher.observe(element);

    return () => {
      watcher.disconnect();
      element.removeEventListener('playing', onPlaying);
      element.removeEventListener('pause', onPause);
    };
  }, []);

  const onPlay = (event: MouseEvent<HTMLButtonElement>) => {
    // On the Engineering card the video sits inside the card's link: this control plays, it does not navigate.
    event.preventDefault();
    event.stopPropagation();
    if (!video.current) return;
    wanted.current = true;
    start(video.current);
  };

  return (
    <div className="arcana-video">
      <video ref={video} className={className} muted loop playsInline preload="metadata"
        poster={arcanaDemo.video.poster} aria-label={`Arcana replaying a trading backtest on ${arcanaDemo.market}`}>
        <source src={arcanaDemo.video.mp4} type="video/mp4" />
      </video>
      {!playing && !settling && (
        <button type="button" className="arcana-video__play" onClick={onPlay} aria-label="Play the demo replay">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" /></svg>
          <span aria-hidden="true">Play replay</span>
        </button>
      )}
    </div>
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
