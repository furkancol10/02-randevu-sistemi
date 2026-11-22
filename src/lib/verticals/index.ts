import { kuafor } from './kuafor';
import type { VerticalConfig } from './types';

const verticals: Record<string, VerticalConfig> = { kuafor };

export function getVertical(id: string): VerticalConfig {
	const v = verticals[id];
	if (!v) throw new Error(`Bilinmeyen sektör: ${id}`);
	return v;
}

export type { VerticalConfig } from './types';
