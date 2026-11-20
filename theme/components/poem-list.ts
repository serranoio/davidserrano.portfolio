import { LitElement, html, nothing, type PropertyValues } from 'lit';
import floatingButtonStyles from './floating-button.styles';
import styles from './poem-list.styles';
import { POEMS, poemIndexOfSection } from './petal-sections';

const PANEL_ID = 'poem-list-panel';
// Below this width the open panel covers the poem, so choosing a poem also
// closes the list to let it be read.
const NARROW_QUERY = '(max-width: 60rem)';
// Only a real hovering pointer opens the list from the rose; a tap's
// synthesized hover must not cover the poem it is about to open.
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

export interface PoemSelectDetail {
  sectionId: string;
}

// The bottom-left list of every poem on the rose. It owns only whether it is
// open; which poem is showing, which is hovered and which have been read
// belong to <golden-rose>, which passes them in and opens whatever this
// element asks for via `poem-select`. Hovering a petal opens the list on the
// poem it carries.
export class PoemListElement extends LitElement {
  static styles = [floatingButtonStyles, styles];

  static properties = {
    activeSection: { type: String, attribute: false },
    hoveredSection: { type: String, attribute: false },
    readPoems: { attribute: false },
    open: { type: Boolean, state: true },
  };

  private _activeSection: string | null = null;
  private _open = false;
  private _hoveredSection: string | null = null;
  private _readPoems: ReadonlySet<string> = new Set();
  // Opened by hovering a petal: the pointer is on the rose, so focus stays put.
  private openedByHover = false;

  get activeSection() {
    return this._activeSection;
  }
  set activeSection(val: string | null) {
    const oldVal = this._activeSection;
    this._activeSection = val;
    this.requestUpdate('activeSection', oldVal);
  }

  get hoveredSection() {
    return this._hoveredSection;
  }
  set hoveredSection(val: string | null) {
    const oldVal = this._hoveredSection;
    this._hoveredSection = val;
    this.requestUpdate('hoveredSection', oldVal);
  }

  get readPoems() {
    return this._readPoems;
  }
  set readPoems(val: ReadonlySet<string>) {
    const oldVal = this._readPoems;
    this._readPoems = val;
    this.requestUpdate('readPoems', oldVal);
  }

  get open() {
    return this._open;
  }
  set open(val: boolean) {
    const oldVal = this._open;
    this._open = val;
    this.requestUpdate('open', oldVal);
  }

  private get toggleButton() {
    return this.renderRoot.querySelector<HTMLButtonElement>('.toggle');
  }

  private get poemButtons() {
    return [...this.renderRoot.querySelectorAll<HTMLButtonElement>('.poem')];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleWindowKeydown);
  }

  willUpdate(changed: PropertyValues<this>) {
    if (changed.has('hoveredSection') && this.hoveredSection && !this.open && window.matchMedia(HOVER_QUERY).matches) {
      this.openedByHover = true;
      this.open = true;
    }
  }

  updated(changed: PropertyValues<this>) {
    super.updated(changed);
    if (changed.has('hoveredSection') && this.hoveredSection) {
      this.poemButtons[poemIndexOfSection(this.hoveredSection)]?.scrollIntoView({ block: 'nearest' });
    }
    if (!changed.has('open')) return;
    if (this.open) {
      window.addEventListener('keydown', this.handleWindowKeydown);
      if (!this.openedByHover) {
        const active = poemIndexOfSection(this.activeSection);
        this.poemButtons[Math.max(0, active)]?.focus();
      }
      this.openedByHover = false;
    } else {
      window.removeEventListener('keydown', this.handleWindowKeydown);
    }
  }

  private setOpen(open: boolean, { returnFocus = false } = {}) {
    this.open = open;
    if (!open && returnFocus) this.toggleButton?.focus();
  }

  private handleToggle = () => this.setOpen(!this.open);

  private handleClose = () => this.setOpen(false, { returnFocus: true });

  private handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.setOpen(false, { returnFocus: true });
  };

  // Arrow keys walk the list; Home/End jump to its ends.
  private handleListKeydown = (event: KeyboardEvent) => {
    const buttons = this.poemButtons;
    const current = buttons.indexOf(this.shadowRoot?.activeElement as HTMLButtonElement);
    const moves: Record<string, number> = {
      ArrowDown: current + 1,
      ArrowUp: current - 1,
      Home: 0,
      End: buttons.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  private select(index: number) {
    const poem = POEMS[index];
    if (!poem) return;
    this.dispatchEvent(
      new CustomEvent<PoemSelectDetail>('poem-select', {
        detail: { sectionId: poem.sectionId },
        bubbles: true,
        composed: true,
      })
    );
    if (window.matchMedia(NARROW_QUERY).matches) this.setOpen(false, { returnFocus: true });
  }

  // Previous/next poem, wrapping at the ends.
  private step(direction: 1 | -1) {
    const active = poemIndexOfSection(this.activeSection);
    if (active === -1) return;
    this.select((active + direction + POEMS.length) % POEMS.length);
  }

  render() {
    const active = poemIndexOfSection(this.activeSection);
    const hovered = poemIndexOfSection(this.hoveredSection);
    return html`
      <button
        class="floating-button toggle"
        type="button"
        data-testid="poem-list-toggle"
        aria-label=${this.open ? 'Close poem list' : 'Open poem list'}
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls=${PANEL_ID}
        @click=${this.handleToggle}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <rect x="4" y="6" width="16" height="1.6" rx="0.8" />
          <rect x="4" y="11.2" width="16" height="1.6" rx="0.8" />
          <rect x="4" y="16.4" width="10" height="1.6" rx="0.8" />
        </svg>
      </button>
      <nav
        id=${PANEL_ID}
        class="panel ${this.open ? 'open' : ''}"
        data-testid="poem-list-panel"
        aria-labelledby="poem-list-heading"
        ?inert=${!this.open}
      >
        <header class="panel-header">
          <h2 id="poem-list-heading" class="panel-heading">Poems</h2>
          <button
            class="close"
            type="button"
            data-testid="poem-list-close"
            aria-label="Close poem list"
            @click=${this.handleClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <ol class="poems" @keydown=${this.handleListKeydown}>
          ${POEMS.map(
            (poem, index) => html`
              <li>
                <button
                  class="poem ${index === hovered ? 'hovered' : ''} ${this.readPoems.has(poem.title) ? 'read' : ''}"
                  type="button"
                  data-testid="poem-list-item"
                  aria-current=${index === active ? 'true' : nothing}
                  @click=${() => this.select(index)}
                >
                  <span class="poem-title">${poem.title}</span>
                  ${this.readPoems.has(poem.title)
                    ? html`<span class="read-mark" aria-label="read">✓</span>`
                    : nothing}
                </button>
              </li>
            `
          )}
        </ol>
        <div class="steps">
          <button
            class="step"
            type="button"
            data-testid="poem-list-prev"
            ?disabled=${active === -1}
            @click=${() => this.step(-1)}
          >
            <span aria-hidden="true">←</span> Previous
          </button>
          <button
            class="step"
            type="button"
            data-testid="poem-list-next"
            ?disabled=${active === -1}
            @click=${() => this.step(1)}
          >
            Next <span aria-hidden="true">→</span>
          </button>
        </div>
      </nav>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('poem-list')) {
  customElements.define('poem-list', PoemListElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'poem-list': PoemListElement;
  }
  interface HTMLElementEventMap {
    'poem-select': CustomEvent<PoemSelectDetail>;
  }
}
