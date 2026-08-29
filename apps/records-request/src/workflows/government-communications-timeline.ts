export type GovernmentCommunicationEvent={id:string;type:'email'|'text'|'meeting'|'calendar'|'letter'|'message'|'other';date?:string;sourceRecordIds:string[];threadId?:string;description:string;certainty:'documented'|'unknown'}
export type GovernmentCommunicationTimeline={events:GovernmentCommunicationEvent[];contradictions:{id:string;eventIds:string[];description:string}[]}
const DATE=/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/g
const TYPE:Array<[GovernmentCommunicationEvent['type'],RegExp]>=[['email',/email|e-mail/i],['text',/text message|sms|mms/i],['meeting',/meeting|met with/i],['calendar',/calendar|invitation|scheduled/i],['letter',/letter|memo/i],['message',/chat|slack|teams|messaging/i]]
export function buildGovernmentCommunicationTimeline(records:readonly {id:string;text?:string;filename:string;threadId?:string}[]):GovernmentCommunicationTimeline{
 const events:GovernmentCommunicationEvent[]=[]
 for(const r of records){const t=r.text??'';const match=TYPE.find(([,p])=>p.test(`${r.filename} ${t}`));if(!match)continue;const d=[...t.matchAll(DATE)][0];events.push({id:`event-${r.id}`,type:match[0],date:d?`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`:undefined,sourceRecordIds:[r.id],threadId:r.threadId,description:t.slice(0,500),certainty:d?'documented':'unknown'})}
 const contradictions:{id:string;eventIds:string[];description:string}[]=[]
 for(const [threadId] of new Map(events.filter(e=>e.threadId).map(e=>[e.threadId!,true]))) {const group=events.filter(e=>e.threadId===threadId&&e.date);const dates=new Set(group.map(e=>e.date));if(group.length>1&&dates.size>1)contradictions.push({id:`thread-date-${threadId}`,eventIds:group.map(e=>e.id),description:`Multiple dates were found within communication thread ${threadId}; review the source records for chronology reconciliation.`})}
 return{events,contradictions}
}
