import type { ReactNode } from 'react';
import { arcanaDemo } from '../arcana-demo';
import { ArcanaDemoVideo } from './arcana-card';
import { ArcanaLayers } from './arcana-layers';
import { PortfolioPage } from './portfolio-pages';
import { useTabList } from './use-tab-list';
import './arcana-spiral';
import './house-of-arcana-page.css';

type SectionId = 'quant' | 'engineering' | 'backstory';

const SECTIONS: readonly { id: SectionId; label: string; body: () => ReactNode }[] = [
  {
    id: 'quant',
    label: 'Quant',
    body: () => (
      <>
        <ol className="arcana-page__steps">
          <li><strong>Claim.</strong> State a falsifiable market hypothesis and the equation that forecasts it.</li>
          <li><strong>Forecast.</strong> Replay market evidence and score each forecast against what the market did.</li>
          <li><strong>Trade.</strong> Backtest acting on those forecasts, with fees, fills and capital limits simulated.</li>
          <li><strong>Validate.</strong> Hold the configuration fixed and run it once on untouched data before paper trading.</li>
        </ol>
        <p>Every stage can conclude <em>insufficient evidence</em> or <em>do not trade</em>.</p>
      </>
    ),
  },
  {
    id: 'engineering',
    label: 'Engineering',
    body: () => <ArcanaLayers />,
  },
  {
    id: 'backstory',
    label: 'Backstory',
    body: () => <p className="arcana-page__placeholder">The story is coming.</p>,
  },
];

const DEFAULT_SECTION: SectionId = 'quant';
const SECTION_IDS = SECTIONS.map((s) => s.id);

export function HouseOfArcanaPage() {
  // A link may arrive on a section (#backstory) or on a part of one (#engineering-proof).
  const { selected, onKeyDown, tabProps } = useTabList<SectionId>({
    ids: SECTION_IDS,
    initial: DEFAULT_SECTION,
    hashOf: (id) => id,
    fromHash: (hash) => SECTION_IDS.find((id) => hash === id || hash.startsWith(`${id}-`)),
  });

  return (
    <PortfolioPage>
      <div className="arcana-page">
        <arcana-spiral className="arcana-page__spiral" aria-hidden="true" />
        <header className="arcana-page__hero">
          <p className="arcana-page__eyebrow">Project</p>
          <h1 className="arcana-page__title">
            <span className="arcana-page__title-lead">The House of</span>{' '}
            <span className="arcana-page__title-mark">Arcana</span>
          </h1>
          <p className="arcana-page__tagline">
            Automated trading platform on <span className="arcana-page__venue">Kalshi</span>
          </p>
          <p className="arcana-page__introduction">
            A research platform where every trading idea enters as a falsifiable claim and leaves as evidence: a scored
            forecast and a backtested trade with real fees and fills, tuned on a training period and judged on a
            validation period it never saw.
          </p>
        </header>
        <figure className="arcana-page__demo">
          <ArcanaDemoVideo className="arcana-page__video" />
          <figcaption className="arcana-page__caption">{arcanaDemo.caption}</figcaption>
        </figure>

        <div className="arcana-page__tabs" role="tablist" aria-label="The House of Arcana" onKeyDown={onKeyDown}>
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" id={`arcana-tab-${s.id}`} aria-controls={`arcana-panel-${s.id}`}
              {...tabProps(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        {SECTIONS.map((s) => (
          <section key={s.id} id={`arcana-panel-${s.id}`} className="arcana-page__section" role="tabpanel"
            aria-labelledby={`arcana-tab-${s.id}`} hidden={selected !== s.id} tabIndex={0}>
            {s.body()}
          </section>
        ))}
      </div>
    </PortfolioPage>
  );
}
