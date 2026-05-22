import type { PropsWithChildren, ReactNode } from "react";

export type Props = PropsWithChildren<{
    label: string;
    disabled?: boolean;
    onClick?(): void;
}>
export function MenuItem(_: Props): ReactNode{
    throw new Error('MenuItem should be placed inside a Menu component');
}