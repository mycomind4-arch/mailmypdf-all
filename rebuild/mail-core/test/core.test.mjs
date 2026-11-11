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
 assert.throws(()=>core.paid({eventId:'evt1',checkoutId,amountCents:498,packetSha256:sha}),/unverified payment/);
 assert.throws(()=>core.paid({eventId:'evt1',checkoutId,amountCents:499,packetSha256:'wrong'}),/unverified payment/);
 assert.equal(core.paid({eventId:'evt1',checkoutId,amountCents:499,packetSha256:sha}),true);
 assert.equal(core.paid({eventId:'evt1',checkoutId,amountCents:499,packetSha256:sha}),false);
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
