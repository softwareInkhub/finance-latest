import jsPDF from 'jspdf';

export function convertTxtToPdf(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const doc = new jsPDF();
        doc.text(text, 10, 10);
        const pdfBlob = doc.output('blob');
        resolve(pdfBlob);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 