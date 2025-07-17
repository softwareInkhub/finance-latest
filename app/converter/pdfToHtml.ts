'use client';

import * as pdfjsLib from 'pdfjs-dist';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  fontName: string;
  hasEOL: boolean;
}



export async function convertPdfToHtml(file: File): Promise<string> {
  // Set up the worker (for client-side)
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDF to HTML</title></head><body>';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map(item => item.str)
      .join(' ');
    html += `<div class="pdf-page"><h2>Page ${i}</h2><p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>`;
  }
  html += '</body></html>';
  return html;
} 