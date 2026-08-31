export type CaptureSource = 'upload' | 'camera' | 'scan';
export type CaptureQuality = 'good' | 'review' | 'poor';

export type DocumentCapture = {
  source: CaptureSource;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  quality: CaptureQuality;
  pageCount?: number;
  capturedAt: string;
};

export function assessCapture(input: Pick<DocumentCapture, 'sizeBytes'|'mimeType'>): CaptureQuality {
  if (input.sizeBytes <= 0 || input.sizeBytes > 25 * 1024 * 1024) return 'poor';
  if (!['application/pdf','image/jpeg','image/png'].includes(input.mimeType)) return 'poor';
  return 'good';
}
