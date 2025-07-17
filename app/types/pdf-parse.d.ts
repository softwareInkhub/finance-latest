declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    IsCollectionPresent?: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: string | boolean | undefined;
  }

  interface PDFMetadata {
    'dc:creator'?: string;
    'dc:format'?: string;
    'dc:title'?: string;
    'pdf:producer'?: string;
    'pdf:encrypted'?: boolean;
    'xmp:createdate'?: string;
    'xmp:modifydate'?: string;
    [key: string]: string | boolean | undefined;
  }

  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata;
    version: string;
  }

  interface PDFPageData {
    getTextContent: () => Promise<{
      items: Array<{
        str: string;
        transform: number[];
        width: number;
        height: number;
        dir: string;
      }>;
    }>;
    getAnnotations: () => Promise<Array<{
      subtype: string;
      rect: number[];
      contents: string;
    }>>;
  }

  interface PDFParseOptions {
    pagerender?: (pageData: PDFPageData) => string;
    max?: number;
    version?: string;
  }

  function PDFParse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFData>;
  export = PDFParse;
} 