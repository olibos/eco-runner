import { Briefing } from "../briefing/Briefing";
import { MainMenu } from "../menu/MainMenu";
import Wipeout from "../wipeout";
import { useLocalState } from "../../hooks/local-state";
import { MenuItem } from "../menu/MenuItem";
import { Separator } from "../menu/Separator";
import { Dashboard } from "./Dashboard";
import { Leaderboard } from "./Leaderboard";
import { Challenges } from "./Challenges";
import { useFullscreen } from "../../hooks/full-screen";
import { useFuelData } from "../../hooks/useFuelData";
import { useBeforeInstallPrompt } from "../../hooks/before-install-prompt";

export function Game() {
    const [showBriefing, setShowBriefing] = useLocalState('show-briefing', true);
    const { data } = useFuelData();
    const beforeInstallPrompt = useBeforeInstallPrompt();
    const isFullscreen = useFullscreen();
    function handleClose() {
        document.exitFullscreen();
        window.close();
    }
    const hasStats = data?.stats && data.stats.length > 0;
    return (
        <>
            <Wipeout />
            {showBriefing ? (
                <Briefing onClose={() => setShowBriefing(false)} />
            ) : (
                data && <>
                    <MainMenu>
                        <MenuItem label="Dashboard" disabled={!hasStats}>
                            <Dashboard />
                        </MenuItem>
                        <MenuItem label="Classement">
                            <Leaderboard />
                        </MenuItem>
                        <MenuItem label="Défis" disabled={!hasStats}>
                            <Challenges />
                        </MenuItem>
                        <Separator />
                        <MenuItem label="Briefing">
                            <Briefing />
                        </MenuItem>
                        {beforeInstallPrompt && <MenuItem label="Installer" onClick={beforeInstallPrompt} />}
                        {isFullscreen && <MenuItem label="Fermer" onClick={handleClose} />}
                    </MainMenu>
                </>
            )}
        </>
    );
}