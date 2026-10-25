import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import { createWorker } from 'tesseract.js';
import type { TextItem } from './text-layout.js';

const MAX_PAGES = 10;
// Render scanned pages at 3x so small payslip digits stay readable for OCR.
const OCR_SCALE = 3;

// Text items of each page, with y measured from the top of the page.
export async function readPdfText(buffer: Buffer): Promise<TextItem[][]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const pages: TextItem[][] = [];
  for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
    const page = await pdf.getPage(n);
    const { height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((i) => 'str' in i && i.str.trim())
        .map((i) => {
          const item = i as { str: string; transform: number[]; width: number };
          return {
            text: item.str.trim(),
            x: item.transform[4],
            y: height - item.transform[5],
            width: item.width,
          };
        }),
    );
  }
  return pages;
}

export const hasText = (pages: TextItem[][]) =>
  pages.reduce((n, p) => n + p.reduce((m, i) => m + i.text.length, 0), 0) > 30;

// Scanned PDFs are only images: render each page and read it with OCR
// (Tesseract, offline, French + English). Positions are scaled back to PDF
// units so the parsers work the same way as with text PDFs.
export async function readPdfWithOcr(buffer: Buffer): Promise<TextItem[][]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const count = Math.min(pdf.numPages, MAX_PAGES);
  const worker = await createWorker(['fra', 'eng'], undefined, {
    cachePath: join(tmpdir(), 'expensecontrol-ocr'),
  });
  try {
    const pages: TextItem[][] = [];
    for (let n = 1; n <= count; n++) {
      const image = await renderPageAsImage(new Uint8Array(buffer), n, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: OCR_SCALE,
      });
      const { data } = await worker.recognize(Buffer.from(image), {}, { blocks: true });
      const words = (data.blocks ?? []).flatMap((block) =>
        block.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
      );
      pages.push(
        words
          .filter((w) => w.text.trim() && w.confidence > 30)
          .map((w) => ({
            text: w.text.trim(),
            x: w.bbox.x0 / OCR_SCALE,
            y: (w.bbox.y0 + w.bbox.y1) / 2 / OCR_SCALE,
            width: (w.bbox.x1 - w.bbox.x0) / OCR_SCALE,
          })),
      );
    }
    return pages;
  } finally {
    await worker.terminate();
  }
}
