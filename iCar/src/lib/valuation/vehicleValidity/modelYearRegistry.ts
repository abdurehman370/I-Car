/**
 * Deterministic model-year registry for common exotic/luxury edge cases.
 * Prevents valuations for model-year combinations that never existed
 * (e.g. a "2020 Lamborghini Revuelto") without any API cost.
 *
 * Matching is tolerant: lowercase, hyphens/dots stripped, whitespace
 * collapsed; aliases matched as whole phrases against "model variant".
 */

export type ModelYearRegistryEntry = {
    /** Normalized make tokens that identify the manufacturer. */
    makeAliases: string[];
    /** Normalized model/trim phrases that identify this exact model. */
    modelAliases: string[];
    earliestValidYear: number;
    latestKnownYear?: number | null;
    /** Alternatives that DID exist in earlier years for this make. */
    suggestedModelsForYear?: string[];
    note?: string;
};

export function normalizeVehicleName(value: string | null | undefined): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[-–—.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const REGISTRY: ModelYearRegistryEntry[] = [
    {
        makeAliases: ['lamborghini'],
        modelAliases: ['revuelto', 'revuelto base', 'lamborghini revuelto'],
        earliestValidYear: 2024,
        suggestedModelsForYear: ['Aventador', 'Huracan', 'Urus'],
        note: 'Unveiled in 2023; 2024+ model years.',
    },
    {
        makeAliases: ['lamborghini'],
        modelAliases: ['urus se'],
        earliestValidYear: 2025,
        suggestedModelsForYear: ['Urus', 'Urus S', 'Urus Performante'],
    },
    {
        makeAliases: ['ferrari'],
        modelAliases: ['purosangue'],
        earliestValidYear: 2023,
        suggestedModelsForYear: ['GTC4Lusso', '812', 'F8 Tributo'],
    },
    {
        makeAliases: ['ferrari'],
        modelAliases: ['296 gtb', '296 gts', '296'],
        earliestValidYear: 2022,
        suggestedModelsForYear: ['F8 Tributo', 'SF90 Stradale', 'Roma'],
    },
    {
        makeAliases: ['ferrari'],
        modelAliases: ['sf90', 'sf90 stradale', 'sf90 spider'],
        earliestValidYear: 2020,
        suggestedModelsForYear: ['488 Pista', '812 Superfast', 'F8 Tributo'],
    },
    {
        makeAliases: ['rolls royce', 'rolls'],
        modelAliases: ['spectre'],
        earliestValidYear: 2024,
        suggestedModelsForYear: ['Wraith', 'Ghost', 'Phantom', 'Cullinan'],
    },
    {
        makeAliases: ['tesla'],
        modelAliases: ['cybertruck'],
        earliestValidYear: 2024,
        suggestedModelsForYear: ['Model S', 'Model X', 'Model Y', 'Model 3'],
    },
    {
        // Only blocks when the L460 generation is explicitly named —
        // generic "Range Rover" is never blocked.
        makeAliases: ['land rover', 'range rover'],
        modelAliases: ['l460', 'range rover l460'],
        earliestValidYear: 2022,
        suggestedModelsForYear: ['Range Rover L405', 'Range Rover Sport', 'Range Rover Velar'],
    },
    // NOTE: deliberately no G63 entry — ordinary AMG G63 exists for 2019+ (and
    // earlier W463 generations), so blocking on generation naming is unsafe.
];

export type RegistryMatch = {
    entry: ModelYearRegistryEntry;
};

/** Whole-phrase containment: "urus" does NOT match the "urus se" alias. */
function phraseMatches(target: string, phrase: string): boolean {
    if (!phrase) return false;
    const pattern = new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`);
    return pattern.test(target);
}

export function findRegistryEntry(params: {
    make: string;
    model: string;
    variant?: string | null;
}): RegistryMatch | null {
    const make = normalizeVehicleName(params.make);
    const modelAndVariant = normalizeVehicleName(`${params.model} ${params.variant || ''}`);
    const full = `${make} ${modelAndVariant}`;

    for (const entry of REGISTRY) {
        const makeMatch = entry.makeAliases.some(
            (alias) => phraseMatches(make, alias) || phraseMatches(full, alias)
        );
        if (!makeMatch) continue;

        const modelMatch = entry.modelAliases.some(
            (alias) => phraseMatches(modelAndVariant, alias) || phraseMatches(full, alias)
        );
        if (modelMatch) return { entry };
    }

    return null;
}
