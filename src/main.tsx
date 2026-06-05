import ReactDOM from 'react-dom/client'
import App from './App'
import { StrictMode } from 'react'
import { BackgroundSoundProvider } from './hooks/background-sound'
import { SWRConfig, type Cache, type SWRConfiguration } from 'swr';

const swr = {
    async fetcher(url: string) {
        const res = await fetch(url);

        if (res.status === 401) {
            location.assign('/auth/login');
            throw new Error('Unauthorized')
        };

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        return res.json();
    },
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
    compare(a, b) {
      return a === b || (a?.etag && a.etag === b?.etag);
    },
    provider() {
      const map = new Map<string, any>(JSON.parse(localStorage.getItem('app-cache') ?? '[]'));

      window.addEventListener('beforeunload', () => {
        const appCache = JSON.stringify(Array.from(map.entries()));
        localStorage.setItem('app-cache', appCache);
      });

      return map;
    }
} as const satisfies SWRConfiguration;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackgroundSoundProvider>
      <SWRConfig value={swr}>
        <App />
      </SWRConfig>
    </BackgroundSoundProvider>
  </StrictMode>
)
