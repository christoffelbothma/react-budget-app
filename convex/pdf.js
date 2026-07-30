"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";

const MAX_PDF_BYTES = 3 * 1024 * 1024;

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

export const extractPdfText = action({
  args: {
    dataBase64: v.string(),
  },
  handler: async (ctx, { dataBase64 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("You must be signed in.");
    }

    const data = Buffer.from(dataBase64, "base64");
    if (!data.length || data.length > MAX_PDF_BYTES) {
      throw new ConvexError("The PDF is too large for iPhone compatibility mode.");
    }
    if (data.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new ConvexError("The selected file is not a valid PDF.");
    }

    let document;
    try {
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      document = await getDocument({
        data: new Uint8Array(data),
        disableFontFace: true,
        isEvalSupported: false,
        useWasm: false,
      }).promise;

      const pages = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push({
          items: (content.items || []).map((item) => ({
            str: String(item.str || ""),
            x: Number(item.transform?.[4] || 0),
            y: Number(item.transform?.[5] || 0),
          })),
          pageNumber,
        });
      }

      return { pages };
    } catch (error) {
      console.error("PDF text extraction failed:", error?.name, error?.message);
      if (/password/i.test(String(error?.message || error))) {
        throw new ConvexError("Remove the PDF password before importing it.");
      }
      throw new ConvexError("BudgetR could not extract text from this PDF.");
    } finally {
      if (typeof document?.cleanup === "function") {
        await document.cleanup();
      }
    }
  },
});
