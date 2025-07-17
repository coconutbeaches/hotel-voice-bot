// Voice Widget Embed Script
// This can be included on any website to add the voice assistant

interface CoconutVoiceConfig {
  apiUrl?: string;
  wakeWord?: string;
  defaultVoice?: string;
  enableWakeWord?: boolean;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  customStyles?: Record<string, any>;
  onError?: (error: Error) => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

declare global {
  interface Window {
    CoconutVoice: {
      init: (config?: CoconutVoiceConfig) => void;
      destroy: () => void;
      config: CoconutVoiceConfig;
    };
  }
}

(function () {
  let widgetContainer: HTMLDivElement | null = null;
  let widgetRoot: any = null;

  const defaultConfig: CoconutVoiceConfig = {
    apiUrl: 'https://hotel-voice-bot-staging.fly.dev',
    wakeWord: 'Hey Coconut',
    defaultVoice: 'cove',
    enableWakeWord: false,
    theme: 'light',
    position: 'bottom-right',
  };

  function loadStyles() {
    const styleId = 'coconut-voice-widget-styles';
    if (document.getElementById(styleId)) return;

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = `${defaultConfig.apiUrl}/widget/styles.css`;
    document.head.appendChild(link);
  }

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function init(userConfig?: CoconutVoiceConfig) {
    try {
      const config = { ...defaultConfig, ...userConfig };
      window.CoconutVoice.config = config;

      // Load required dependencies if not already loaded
      if (!window.React) {
        await loadScript(
          'https://unpkg.com/react@18/umd/react.production.min.js'
        );
      }
      if (!window.ReactDOM) {
        await loadScript(
          'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
        );
      }

      // Load styles
      loadStyles();

      // Create container
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'coconut-voice-widget-root';
      document.body.appendChild(widgetContainer);

      // Load and render the widget
      const widgetUrl = `${config.apiUrl}/widget/bundle.js`;
      await loadScript(widgetUrl);

      // The bundle should expose the widget component
      if ((window as any).CoconutVoiceWidget) {
        const React = (window as any).React;
        const ReactDOM = (window as any).ReactDOM;
        const VoiceWidget = (window as any).CoconutVoiceWidget;

        widgetRoot = ReactDOM.createRoot(widgetContainer);
        widgetRoot.render(React.createElement(VoiceWidget, { config }));
      } else {
        throw new Error('Voice widget component not found');
      }
    } catch (error) {
      console.error('Failed to initialize Coconut Voice Widget:', error);
      if (userConfig?.onError) {
        userConfig.onError(error as Error);
      }
    }
  }

  function destroy() {
    if (widgetRoot) {
      widgetRoot.unmount();
      widgetRoot = null;
    }
    if (widgetContainer) {
      widgetContainer.remove();
      widgetContainer = null;
    }
  }

  // Expose API
  window.CoconutVoice = {
    init,
    destroy,
    config: defaultConfig,
  };

  // Auto-init if data attributes are present
  const scriptTag = document.currentScript;
  if (scriptTag) {
    const autoInit = scriptTag.getAttribute('data-auto-init') !== 'false';
    if (autoInit) {
      const configAttrs: CoconutVoiceConfig = {};

      // Parse data attributes
      const apiUrl = scriptTag.getAttribute('data-api-url');
      const theme = scriptTag.getAttribute('data-theme') as 'light' | 'dark';
      const position = scriptTag.getAttribute('data-position') as any;
      const wakeWord = scriptTag.getAttribute('data-wake-word');
      const enableWakeWord = scriptTag.getAttribute('data-enable-wake-word');

      if (apiUrl) configAttrs.apiUrl = apiUrl;
      if (theme) configAttrs.theme = theme;
      if (position) configAttrs.position = position;
      if (wakeWord) configAttrs.wakeWord = wakeWord;
      if (enableWakeWord)
        configAttrs.enableWakeWord = enableWakeWord === 'true';

      // Initialize on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(configAttrs));
      } else {
        init(configAttrs);
      }
    }
  }
})();
