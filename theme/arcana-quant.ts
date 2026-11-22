/**
 * The Quant timeline on /house-of-arcana: the research pipeline's four steps, each shown with Arcana's own screen.
 * The media are `bun run arcana ui video` renders (shot lists `showcase-claim`, `showcase-forecast`,
 * `showcase-trade`, `showcase-validate`) over the run `bun run verify demo` keeps, on synthetic DEMO-MARKET
 * markets. Re-render them and the validation numbers below together.
 */
export type ArcanaQuantMedia =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'video'; src: string; poster: string; label: string };

export interface ArcanaQuantStep {
  name: string;
  text: string;
  media: ArcanaQuantMedia;
  /** A short factual line under the media. */
  caption?: string;
}

const media = (file: string) => `/arcana-demo/quant/${file}`;

/** In order. Any step may stop an idea; only a validated one goes on to paper trading. */
export const arcanaQuantSteps: readonly ArcanaQuantStep[] = [
  {
    name: 'Claim',
    text: 'State a falsifiable market hypothesis and the equation that forecasts it.',
    media: {
      kind: 'image',
      src: media('claim.jpg'),
      alt: "Arcana's Research dashboard: the Order-flow persistence hypothesis card, outlined, beside Liquidity absorption and Correlated momentum, each with its backtest net return and return chart.",
    },
  },
  {
    name: 'Forecast',
    text: 'Replay market evidence and score each forecast against what the market did.',
    media: {
      kind: 'video',
      src: media('forecast.mp4'),
      poster: media('forecast-poster.jpg'),
      label: 'Arcana stepping the Order-flow persistence forecast through its origins on DEMO-MARKET',
    },
  },
  {
    name: 'Trade',
    text: 'Backtest acting on the forecasts, with fees, fills and capital limits simulated.',
    media: {
      kind: 'video',
      src: media('trade.mp4'),
      poster: media('trade-poster.jpg'),
      label: 'Arcana replaying the Order-flow persistence trading backtest on DEMO-MARKET, trade by trade',
    },
  },
  {
    name: 'Validate',
    text: 'Freeze the configuration and run it once on a held-out validation period.',
    media: {
      kind: 'image',
      src: media('validate.jpg'),
      alt: "Arcana's Verdict for Order-flow persistence: Training, 0.18% net return over 21 trades, beside out-of-sample validation, 1.82% net return over 20 trades, each with its realized return chart.",
    },
    caption: 'Training 0.18% net return; out-of-sample validation 1.82%. A 60/40 split on synthetic demo markets.',
  },
];
