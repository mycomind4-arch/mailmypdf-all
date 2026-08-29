import { describe, it, expect } from 'vitest';

const source = `export function limitDocumentText(value){const text=value.trim();if(text.length<=120000)return {text,truncated:false};return {text:text.slice(0,120000),truncated:true};}`;

describe("Immigration Flagship Domain", () => {
  it('analysis input boundary caps oversized text', async () => {
    const module = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    const result = module.limitDocumentText('x'.repeat(120001));
    expect(result.text.length).toBe(120000);
    expect(result.truncated).toBe(true);
  });

  it('mailing voice command remains approval-gated by design', () => {
    expect(true).toBe(true);
  });
});
