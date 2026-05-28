import { useState } from 'react'
import './App.scss'
import '@fontsource/orbitron/900.css';
import { Intro } from './components/Intro'
import { Game } from './components/game/Game';
import { FuelDataProvider } from './hooks/useFuelData';
import { ReloadPrompt } from './components/common/ReloadPrompt';
import { useIsStandalone } from './hooks/is-standalone';



export default function App() {
  const isStandalone = useIsStandalone();
  const [showIntro, setShowIntro] = useState(isStandalone);

  return (
    <FuelDataProvider>
      {showIntro ?
        <Intro onClose={() => setShowIntro(false)} /> :
        <Game />
      }
      <ReloadPrompt />
    </FuelDataProvider>
  )
}
