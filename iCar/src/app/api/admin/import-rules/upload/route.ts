import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { extractText } from "unpdf";
import { extractImportRulesFromText } from "@/lib/valuation/importRules/extractImportRulesFromText";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

function buildVersion(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toISOString().slice(11, 19).replace(/:/g, "");
    return `lebanon-${date}-${time}-${uuidv4().slice(0, 4)}`;
}

/**
 * Admin-only: upload a Lebanon import-rules PDF.
 * Extracts text, converts to structured rules JSON via OpenAI (once),
 * and stores the document as a draft for review before activation.
 */
export async function POST(req: NextRequest) {
    const session = await getAdminSession();
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { fileName, fileData, region } = body as {
            fileName?: string;
            fileData?: string;
            region?: string;
        };

        const targetRegion = (region || "LEBANON").toUpperCase();
        if (targetRegion !== "LEBANON") {
            return NextResponse.json(
                { message: "Only LEBANON import rules are supported currently" },
                { status: 400 }
            );
        }

        if (typeof fileData !== "string" || !fileData.startsWith("data:application/pdf;base64,")) {
            return NextResponse.json(
                { message: "Please upload a PDF file" },
                { status: 400 }
            );
        }

        const base64 = fileData.slice("data:application/pdf;base64,".length);
        const buffer = Buffer.from(base64, "base64");

        if (buffer.length === 0) {
            return NextResponse.json({ message: "Empty PDF file" }, { status: 400 });
        }

        if (buffer.length > MAX_PDF_BYTES) {
            return NextResponse.json(
                { message: "PDF too large (max 10 MB)" },
                { status: 400 }
            );
        }

        // 1. Extract text server-side
        let extractedText = "";
        try {
            const result = await extractText(new Uint8Array(buffer), { mergePages: true });
            extractedText = String(result.text || "").trim();
        } catch (err) {
            console.error("PDF text extraction failed:", err);
            return NextResponse.json(
                { message: "Could not extract text from this PDF. Please check the file." },
                { status: 422 }
            );
        }

        if (extractedText.length < 20) {
            return NextResponse.json(
                { message: "The PDF contains no readable text (is it a scanned image?)" },
                { status: 422 }
            );
        }

        // 2. Convert to structured rules JSON (OpenAI — upload time only)
        const version = buildVersion();
        let rulesJson;
        try {
            rulesJson = await extractImportRulesFromText({
                extractedText,
                version,
            });
        } catch (err: any) {
            console.error("Rules extraction failed:", err);
            return NextResponse.json(
                { message: err?.message || "Failed to convert PDF text into structured rules" },
                { status: 422 }
            );
        }

        // 3. Store the PDF using the app's existing local-uploads pattern
        const uploadDir = path.join(process.cwd(), "public", "uploads", "import-rules");
        await fs.mkdir(uploadDir, { recursive: true });
        const storedName = `${uuidv4()}.pdf`;
        await fs.writeFile(path.join(uploadDir, storedName), buffer);

        // 4. Save as draft for admin review
        const document = await prisma.importRuleDocument.create({
            data: {
                region: targetRegion,
                originalFileName: fileName || "import-rules.pdf",
                fileUrl: `/uploads/import-rules/${storedName}`,
                mimeType: "application/pdf",
                sizeBytes: buffer.length,
                extractedText,
                rulesJson: rulesJson as any,
                status: "draft",
                version,
                uploadedById: Number(session.user.id) || null,
            },
        });

        return NextResponse.json(
            { document, message: "Rules extracted. Review and activate when ready." },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Import rules upload error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
