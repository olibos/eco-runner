import Typewriter from "typewriter-effect";
import { Dialog } from "../common/Dialog";
import { useState } from "react";
import { useScreenWakeLock } from "../../hooks/screen-wake-lock";

const title = (text: string) => `<strong style="font-size: 1.5em;">${text}</strong>`

type Props = {
    onClose?(): void;
}
export function Briefing({ onClose }: Props) {
    const [button, setButton] = useState(false);
    useScreenWakeLock();
    return (
        <Dialog open autoScroll onClose={onClose}>
            <Typewriter
                options={{cursor: "_"}}
                onInit={(typewriter) => {
                    typewriter
                        .changeDelay(50)
                        .typeString(title('TRANSMISSION CRYPTÉE...'))
                        .pauseFor(500)
                        .changeDelay(25)
                        .typeString(`<br><br>

Le triangle de Muzor est verrouillé! Les flux énergétiques mondiaux sont à l'arrêt et les réserves de la Corporation sont au plus bas.
<br><br>
Votre véhicule a été reconfiguré avec le système de navigation AG-7.
<br><br>
${title('🔧 PARAMÈTRES D\'OPTIMISATION :')}`)
                        .pauseFor(500)
                        .typeString(`
<ul>
<li><b>Pilotage prédictif</b>: conduite fluide, anticipation des flux. Lever le pied en amont, c'est convertir chaque goutte en distance utile.<br><br></li>
<li><b>Coop mode activé</b>: covoiturage = mutualisation d'énergie cinétique. Moins de véhicules en circulation, moins de friction sur le réseau.<br><br></li>
<li><b>Filtrer les trajets parasites</b>: si le déplacement n'a pas de finalité opérationnelle, il est annulé. Pas de kilomètres fantômes dans le système.<br><br></li>
<li><b>Alternatives déverrouillées</b>: mobilité douce, transports collectifs…<br><br></li>
</ul>

L'efficience est la seule métrique qui compte...`)
                        .callFunction(() => setButton(true))
                        .start();
                }}
            />
            {button && <button className="dialog-button">Close</button>}
        </Dialog>
    );
}