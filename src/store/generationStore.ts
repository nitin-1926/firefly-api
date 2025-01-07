import { create } from 'zustand';

interface GenerationResult {
	imageUrl: string;
	generatedAt: number;
}

interface GenerationState {
	results: Record<string, GenerationResult>;
	originalDimensions: { width: number; height: number } | null;
	setResult: (service: string, imageUrl: string) => void;
	setOriginalDimensions: (dimensions: { width: number; height: number }) => void;
	resetResults: () => void;
}

export const useGenerationStore = create<GenerationState>(set => ({
	results: {},
	originalDimensions: null,
	setResult: (service, imageUrl) =>
		set(state => ({
			results: {
				...state.results,
				[service]: {
					imageUrl,
					generatedAt: Date.now(),
				},
			},
		})),
	setOriginalDimensions: dimensions =>
		set(() => ({
			originalDimensions: dimensions,
		})),
	resetResults: () =>
		set(() => ({
			results: {},
			originalDimensions: null,
		})),
}));
