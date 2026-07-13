import prisma from '@/lib/db';
import {
    ActiveImportRules,
    LebanonImportRulesJsonSchema,
} from './types';
import { DEFAULT_LEBANON_IMPORT_RULES } from './defaultRules';

/**
 * Loads the currently active LEBANON import rules from the database.
 * Falls back to the built-in default rule set (clearly flagged) so the
 * system keeps working before any PDF has been uploaded/activated.
 */
export async function getActiveImportRules(
    region: 'LEBANON' = 'LEBANON'
): Promise<ActiveImportRules> {
    try {
        const doc = await prisma.importRuleDocument.findFirst({
            where: { region, status: 'active' },
            orderBy: { activatedAt: 'desc' },
        });

        if (doc?.rulesJson) {
            const validation = LebanonImportRulesJsonSchema.safeParse(doc.rulesJson);

            if (validation.success) {
                return {
                    rules: validation.data,
                    isDefaultRules: false,
                    documentId: doc.id,
                };
            }

            console.error(
                `Active import rule document #${doc.id} has invalid rulesJson — falling back to defaults`,
                validation.error.flatten()
            );
        }
    } catch (err) {
        console.error('Failed to load active import rules — falling back to defaults:', err);
    }

    return {
        rules: DEFAULT_LEBANON_IMPORT_RULES,
        isDefaultRules: true,
        documentId: null,
    };
}
