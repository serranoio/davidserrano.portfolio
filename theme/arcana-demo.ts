/**
 * The House of Arcana's demo run, as the portfolio shows it: a screen recording of Arcana's own
 * UI over the run `bun run verify demo` keeps (five hypotheses on synthetic DEMO-MARKET markets).
 * Each net return is the value Arcana's dashboard shows for that hypothesis; re-record and update
 * them together.
 */
export interface ArcanaDemoHypothesis {
  thesis: string;
  /** Net return of the hypothesis's shown backtest, as a fraction of starting capital. */
  netReturn: number;
}

export const arcanaDemo = {
  route: '/house-of-arcana',
  market: 'DEMO-MARKET',
  /** Says what the recording shows, under the video on /house-of-arcana. */
  caption:
    "A demo backtest on synthetic market data. It walks from the dashboard into one hypothesis's trading view on DEMO-MARKET and replays the backtest, so you can watch every trade as it happens.",
  video: {
    mp4: '/arcana-demo/backtest.mp4',
    poster: '/arcana-demo/poster.jpg',
  },
  hypotheses: [
    { thesis: 'Order-flow persistence', netReturn: 0.02 },
    { thesis: 'Liquidity absorption', netReturn: 0.0125 },
    { thesis: 'Correlated momentum', netReturn: 0.005 },
    { thesis: 'Demand saturation', netReturn: 0.0004 },
    { thesis: 'Momentum exhaustion', netReturn: -0.3793 },
  ] as readonly ArcanaDemoHypothesis[],
} as const;
