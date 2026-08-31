import { describe, expect, it } from 'vitest'
import { buildGovernmentCommunicationTimeline } from './government-communications-timeline'
describe('government communications timeline',()=>{
 it('links communication events to source records and threads',()=>{const t=buildGovernmentCommunicationTimeline([{id:'r1',filename:'a.eml',text:'Email sent 2026-01-02',threadId:'T1'},{id:'r2',filename:'b.eml',text:'Email reply 2026-01-03',threadId:'T1'}]);expect(t.events).toHaveLength(2);expect(t.events[0].sourceRecordIds).toEqual(['r1']);expect(t.contradictions).toHaveLength(1)})
})
