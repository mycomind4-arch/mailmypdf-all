import test from 'node:test';
import assert from 'node:assert/strict';
import {MockMailCore,packet} from '../src/core.mjs';
const addr={name:'Example Person',line1:'123 Example St',city:'Exampletown',state:'CA',postalCode:'90001'};
const pdf=Buffer.from('%PDF-1.4\nsynthetic test only');
const input={ownerId:'alice',pdf,sender:addr,recipient:addr,priceCents:499};
test('mock-only end to end and replay resistance',()=>{
 const core=new MockMailCore(),id=core.create(input),sha=core.get(id,'alice').packet.packetSha256;
 assert.throws(()=>core.get(id,'bob'),/not found/);
 assert.throws(()=>core.checkout(id,'alice'),/approval required/);
 assert.throws(()=>core.approve(id,'alice','wrong'),/packet mismatch/);
 core.approve(id,'alice',sha);
 const checkoutId=core.checkout(id,'alice');
 assert.equal(core.checkout(id,'alice'),checkoutId);
 assert.throws(()=>core.submit(id,'alice'),/verified payment/);
 const wrongAmount={eventId:'evt1',checkoutId,amountCents:498,packetSha256:sha};
 assert.throws(()=>core.paid(wrongAmount,core.mockPaymentSignature(wrongAmount)),/unverified payment/);
 const wrongHash={eventId:'evt1',checkoutId,amountCents:499,packetSha256:'wrong'};
 assert.throws(()=>core.paid(wrongHash,core.mockPaymentSignature(wrongHash)),/unverified payment/);
 const valid={eventId:'evt1',checkoutId,amountCents:499,packetSha256:sha};
 assert.throws(()=>core.paid(valid),/signature required/);
 assert.throws(()=>core.paid(valid,'0'.repeat(64)),/signature required/);
 assert.equal(core.paid(valid,core.mockPaymentSignature(valid)),true);
 assert.equal(core.paid(valid,core.mockPaymentSignature(valid)),false);
 const submission=core.submit(id,'alice');
 assert.equal(core.submit(id,'alice'),submission);
 assert.equal(core.submissions.length,1);
});
test('PDF, address, price validation',()=>{
 assert.throws(()=>packet({...input,pdf:Buffer.from('not a pdf')}),/valid PDF/);
 assert.throws(()=>packet({...input,priceCents:0}),/valid price/);
 assert.throws(()=>packet({...input,sender:{}}),/required/);
});
test('packet changes bind to a different digest',()=>{
 const a=packet(input),b=packet({...input,priceCents:500});
 assert.notEqual(a.packetSha256,b.packetSha256);
});

test('returned order and submission snapshots cannot bypass payment or corrupt internal state',()=>{
 const core=new MockMailCore(),id=core.create(input),view=core.get(id,'alice');
 view.state='paid';
 view.packet.priceCents=1;
 view.ownerId='bob';
 assert.equal(core.get(id,'alice').state,'review');
 assert.throws(()=>core.get(id,'bob'),/not found/);
 assert.throws(()=>core.submit(id,'alice'),/verified payment/);
 const sha=core.get(id,'alice').packet.packetSha256;
 core.approve(id,'alice',sha);
 const checkoutId=core.checkout(id,'alice');
 const payment={eventId:'evt2',checkoutId,amountCents:499,packetSha256:sha};
 assert.throws(()=>core.paid({...payment,amountCents:1},core.mockPaymentSignature(payment)),/signature required/);
 core.paid(payment,core.mockPaymentSignature(payment));
 core.submit(id,'alice');
 core.submissions[0].key='changed';
 assert.equal(core.submissions[0].key,'mail_'+id);
});

test('expired approval fails closed at checkout, payment and submission',()=>{
 let clock=1000;
 const core=new MockMailCore({now:()=>clock,approvalTtlMs:100});
 const id=core.create(input),sha=core.get(id,'alice').packet.packetSha256;
 core.approve(id,'alice',sha);
 clock=1101;
 assert.throws(()=>core.checkout(id,'alice'),/expired/);
 clock=1000;
 const checkoutId=core.checkout(id,'alice');
 clock=1101;
 const payment={eventId:'evt_expired',checkoutId,amountCents:499,packetSha256:sha};
 assert.throws(()=>core.paid(payment,core.mockPaymentSignature(payment)),/unverified payment/);
 clock=1000;
 core.paid(payment,core.mockPaymentSignature(payment));
 clock=1101;
 assert.throws(()=>core.submit(id,'alice'),/verified payment/);
});
