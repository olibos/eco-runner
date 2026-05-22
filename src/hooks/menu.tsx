import { createContext, useContext } from "react";

type Context = {
    close():void;
}
const context = createContext<Context | undefined>(undefined);

type Props = {
    onClose(): void;
    children: React.ReactNode;
}

export function MenuProvider({ onClose, children }: Props) {
    return <context.Provider value={{ close: onClose }}>
        {children}
    </context.Provider>
}

export const useMenu = () => useContext(context);