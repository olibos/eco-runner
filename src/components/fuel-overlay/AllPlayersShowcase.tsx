import { useEffect, useRef } from 'react';
import styles from './AllPlayersShowcase.module.scss';
import useSWR from 'swr';

type Player = {
    name: string;
    av: string;
};

export function AllPlayersShowcase() {

    const { data: players = [], isLoading, error } = useSWR<Player[]>('/api/players');
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;
        const controller = new AbortController();
        function handleResize() {
            scrollEl?.style.setProperty('--speed', `${scrollEl.scrollHeight / 200}s`);
        }
        addEventListener('resize', handleResize, { signal: controller.signal, passive: true });
        handleResize();
        return () => controller.abort();
    }, []);

    if (error) {
        console.error('Failed to fetch players', error);
    }

    console.log('Fetched players for showcase:', players, isLoading, error);
    if (isLoading) return <div>Chargement des participants...</div>;
    if (players.length === 0) return <div>Préparez-vous pour la nouvelle saison !</div>;

    // Duplicate players for seamless loop
    const displayPlayers = [...players, ...players];

    return (
        <>
        <p className={styles.intro}>
            Le classement sera activé dès la réception des premières données de course...
        </p>
        <div className={styles.container}>
            <div className={styles.scrollTrack} ref={scrollRef}>
                {displayPlayers.map((p, i) => (
                    <div key={i} className={styles.playerCard}>
                        <img 
                            src={`https://ik.imagekit.io/olibos/tr:n-thumb/${p.av}.jpg`} 
                            alt="" 
                            className={styles.avatar} 
                        />
                        <span className={styles.name}>{p.name}</span>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
}
