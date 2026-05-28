import { useState } from 'react'
import './App.scss'
import '@fontsource/orbitron/900.css';
import { Intro } from './components/Intro'
import { Game } from './components/game/Game';
import { FuelDataProvider } from './hooks/useFuelData';



export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <FuelDataProvider>
      {showIntro ?
        <Intro onClose={() => setShowIntro(false)} /> :
        <Game />
      }
    </FuelDataProvider>
  )
}
