import { createHash, randomUUID } from 'node:crypto';

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
  constructor() { this.orders=new Map(); this.paymentEvents=new Set(); this.sendKeys=new Set(); this.submissions=[]; }
  create({ownerId,...input}) {
    const value=packet({ownerId,...input}), id=randomUUID();
    this.orders.set(id,{id,ownerId,packet:value,state:'review',approval:null,checkoutId:null,submissionId:null});
    return id;
  }
  get(id,ownerId) {
    const order=this.orders.get(id);
    if (!order || order.ownerId!==ownerId) throw new Error('not found');
    return order;
  }
  approve(id,ownerId,packetSha256) {
    const order=this.get(id,ownerId);
    if(order.state!=='review' || order.packet.packetSha256!==packetSha256) throw new Error('packet mismatch or invalid state');
    order.approval={packetSha256,at:Date.now()};
    order.state='approved';
  }
  checkout(id,ownerId) {
    const order=this.get(id,ownerId);
    if(order.state!=='approved' || order.approval?.packetSha256!==order.packet.packetSha256) throw new Error('approval required');
    order.checkoutId ??= 'test_checkout_'+id;
    return order.checkoutId;
  }
  paid({eventId,checkoutId,amountCents,currency='usd',packetSha256}) {
    if(this.paymentEvents.has(eventId)) return false;
    const order=[...this.orders.values()].find(o=>o.checkoutId===checkoutId);
    if(!order || order.state!=='approved' || !order.approval || order.approval.packetSha256!==packetSha256 || order.packet.packetSha256!==packetSha256 || order.packet.priceCents!==amountCents || order.packet.currency!==currency) throw new Error('unverified payment');
    this.paymentEvents.add(eventId);
    order.state='paid';
    return true;
  }
  submit(id,ownerId) {
    const order=this.get(id,ownerId);
    if(order.state==='submitted') return order.submissionId;
    if(order.state!=='paid' || !order.approval || order.approval.packetSha256!==order.packet.packetSha256) throw new Error('verified payment and approval required');
    const key='mail_'+id;
    if(this.sendKeys.has(key)) return order.submissionId;
    this.sendKeys.add(key);
    order.submissionId='test_lob_'+id;
    order.state='submitted';
    this.submissions.push({key,packetSha256:order.packet.packetSha256});
    return order.submissionId;
  }
}
