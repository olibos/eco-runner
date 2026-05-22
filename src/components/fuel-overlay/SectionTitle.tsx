import type { ReactNode } from 'react';

export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<div className="fo-section-title">
			{children}
			<div className="fo-section-title-line" />
		</div>
	);
}
