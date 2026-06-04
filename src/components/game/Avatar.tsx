import { useFuelData } from '../../hooks/useFuelData';
import Classes from './Avatar.module.scss';
export function Avatar() {
    const { data } = useFuelData();
    const avatar = data?.driver.avatar ?? 'default';
    return (
        <img
            src={`https://ik.imagekit.io/olibos/tr:n-thumb/${avatar}.jpg`}
            alt=""
            onError={e => e.currentTarget.src = '/default.jpg'}
            className={Classes.avatar}
            crossOrigin="anonymous"
        />
    )
}