import ReactDOM from 'react-dom/client'
import App from './App'
import { StrictMode } from 'react'
import { BackgroundSoundProvider } from './hooks/background-sound'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackgroundSoundProvider>
      <App />
    </BackgroundSoundProvider>
  </StrictMode>
)
