import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const required = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' required');
  return value.trim();
};
export function address(value) {
  if (!value || typeof value !== 'object') throw new Error('address required');
  return Object.freeze(Object.fromEntries(['name','line1','city','state','postalCode'].map(k => [k, required(value[k],k)])));
}
export function packet({ ownerId, pdf, sender, recipient, priceCents, currency='usd' }) {
  required(ownerId,'ownerId');
  if (!(pdf instanceof Uint8Array) || pdf.length < 8 || Buffer.from(pdf.subarray(0,5)).toString() !== '%PDF-') throw new Error('valid PDF required');
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) throw new Error('valid price required');
  const snapshot = { ownerId, pdfSha256:digest(pdf), sender:address(sender), recipient:address(recipient), priceCents, currency };
  const packetSha256 = digest(Buffer.from(JSON.stringify(snapshot)));
  return Object.freeze({ ...snapshot, packetSha256 });
}
export class MockMailCore {
  #orders=new Map();
  #paymentEvents=new Set();
  #sendKeys=new Set();
  #submissions=[];
  #mockPaymentKey;
  constructor({mockPaymentKey,approvalTtlMs=15*60*1000,now=()=>Date.now()}={}) {
    if(!Number.isSafeInteger(approvalTtlMs) || approvalTtlMs<=0) throw new Error('valid approval TTL required');
    this.#mockPaymentKey=mockPaymentKey ?? randomUUID();
    this.approvalTtlMs=approvalTtlMs;
    this.now=now;
  }
  get submissions() { return structuredClone(this.#submissions); }
  #getOrder(id,ownerId) {
    const order=this.#orders.get(id);
    if (!order || order.ownerId!==ownerId) throw new Error('not found');
    return order;
  }
  // Synthetic payment signatures only; never use as a Stripe webhook verifier.
  mockPaymentSignature(event) {
    return createHmac('sha256',this.#mockPaymentKey).update(JSON.stringify(event)).digest('hex');
  }
  create({ownerId,...input}) {
    const value=packet({ownerId,...input}), id=randomUUID();
    this.#orders.set(id,{id,ownerId,packet:value,state:'review',approval:null,checkoutId:null,submissionId:null});
    return id;
  }
  get(id,ownerId) { return structuredClone(this.#getOrder(id,ownerId)); }
  approve(id,ownerId,packetSha256) {
    const order=this.#getOrder(id,ownerId);
    if(order.state!=='review' || order.packet.packetSha256!==packetSha256) throw new Error('packet mismatch or invalid state');
    order.approval={packetSha256,at:this.now()};
    order.state='approved';
  }
  #validApproval(order) {
    return !!order.approval && order.approval.packetSha256===order.packet.packetSha256 && this.now()>=order.approval.at && this.now()-order.approval.at<=this.approvalTtlMs;
  }
  checkout(id,ownerId) {
    const order=this.#getOrder(id,ownerId);
    if(order.state!=='approved' || !this.#validApproval(order)) throw new Error('approval required or expired');
    order.checkoutId ??= 'test_checkout_'+id;
    return order.checkoutId;
  }
  paid(event,signature) {
    const {eventId,checkoutId,amountCents,currency='usd',packetSha256}=event ?? {};
    if(typeof signature!=='string' || !/^[a-f0-9]{64}$/.test(signature)) throw new Error('verified mock payment signature required');
    const expected=this.mockPaymentSignature(event);
    if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex'))) throw new Error('verified mock payment signature required');
    if(typeof eventId!=='string' || !eventId.trim()) throw new Error('payment event ID required');
    if(this.#paymentEvents.has(eventId)) return false;
    const order=[...this.#orders.values()].find(o=>o.checkoutId===checkoutId);
    if(!order || order.state!=='approved' || !this.#validApproval(order) || order.approval.packetSha256!==packetSha256 || order.packet.packetSha256!==packetSha256 || order.packet.priceCents!==amountCents || order.packet.currency!==currency) throw new Error('unverified payment');
    this.#paymentEvents.add(eventId);
    order.state='paid';
    return true;
  }
  submit(id,ownerId) {
    const order=this.#getOrder(id,ownerId);
    if(order.state==='submitted') return order.submissionId;
    if(order.state!=='paid' || !this.#validApproval(order)) throw new Error('verified payment and approval required');
    const key='mail_'+id;
    if(this.#sendKeys.has(key)) return order.submissionId;
    this.#sendKeys.add(key);
    order.submissionId='test_lob_'+id;
    order.state='submitted';
    this.#submissions.push({key,packetSha256:order.packet.packetSha256});
    return order.submissionId;
  }
}
