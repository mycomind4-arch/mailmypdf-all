declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: {
      Creator?: string;
      Producer?: string;
      CreationDate?: string;
      ModDate?: string;
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
    };
    metadata: {
      metadata?: string;
      [key: string]: unknown;
    };
    text: string;
    version?: string;
  }

  function pdfParse(buffer: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PdfData>;
  export default pdfParse;
}
