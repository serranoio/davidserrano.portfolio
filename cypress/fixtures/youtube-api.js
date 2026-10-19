// Simulate the external API boundary; exercise the real Lit player and loader.
window.__YT_TEST__ = {
  players: [],
  blockPlayback: false,
  stallPlayback: false,
};
window.YT = {
  Player: class {
    constructor(host, options) {
      this.options = options;
      this.playCalls = 0;
      this.pauseCalls = 0;
      this.destroyed = false;
      this.iframe = document.createElement('iframe');
      this.iframe.width = String(options.width);
      this.iframe.height = String(options.height);
      host.replaceWith(this.iframe);
      window.__YT_TEST__.players.push(this);
      if (!window.__DELAY_YT_READY__) setTimeout(() => this.ready(), 0);
    }
    ready() {
      // Real YouTube methods are unavailable before onReady.
      this.playVideo = () => {
        this.playCalls++;
        if (window.__YT_TEST__.blockPlayback) {
          this.options.events.onAutoplayBlocked({ target: this });
        } else if (!window.__YT_TEST__.stallPlayback) {
          this.options.events.onStateChange({ target: this, data: 1 });
        }
      };
      this.pauseVideo = () => {
        this.pauseCalls++;
        this.options.events.onStateChange({ target: this, data: 2 });
      };
      this.setVolume = (volume) => { this.volume = volume; };
      this.unMute = () => { this.muted = false; };
      this.options.events.onReady({ target: this });
    }
    destroy() {
      this.destroyed = true;
      this.iframe.remove();
    }
  },
};
window.onYouTubeIframeAPIReady();
