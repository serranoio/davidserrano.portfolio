import { LitElement, html } from 'lit';
import styles from './hello-world.styles';

export class HelloWorldElement extends LitElement {
  static styles = [styles];

  render() {
    return html`<h1>Hello World</h1>`;
  }
}

customElements.define('hello-world', HelloWorldElement);

declare global {
  interface HTMLElementTagNameMap {
    'hello-world': HelloWorldElement;
  }
}
