import { describe, expect, it } from 'vitest'
import { analyzeGovernmentCommunicationProduction } from './government-communications-analysis'

describe('government communications production analysis',()=>{
  const requested=[
    {id:'emails',label:'Emails',keywords:['emails']},
    {id:'email-attachments',label:'Email Attachments',keywords:['attachments','attached']},
    {id:'text-messages',label:'Text Messages',keywords:['text messages','SMS']},
  ] as const
  it('detects missing categories and partial production',()=>{
    const result=analyzeGovernmentCommunicationProduction(requested,[{id:'r1',filename:'email.eml',category:'emails',text:'Email thread'}])
    expect(result.coveredCategoryIds).toContain('emails')
    expect(result.missingCategoryIds).toEqual(['email-attachments','text-messages'])
    expect(result.findings).toContainEqual(expect.objectContaining({type:'PARTIAL_PRODUCTION'}))
  })
  it('detects duplicate communications by SHA-256',()=>{
    const result=analyzeGovernmentCommunicationProduction([], [{id:'r1',filename:'a.eml',sha256:'same'},{id:'r2',filename:'b.eml',sha256:'same'}])
    expect(result.findings).toContainEqual(expect.objectContaining({type:'DUPLICATE_RECORD',recordIds:['r1','r2']}))
  })
  it('flags referenced attachments without treating the reference as the attachment',()=>{
    const result=analyzeGovernmentCommunicationProduction([{id:'email-attachments',label:'Email Attachments',keywords:['attachment']}],[{id:'r1',filename:'response.txt',text:'See attached project memo.'}])
    expect(result.missingCategoryIds).toEqual(['email-attachments'])
    expect(result.findings).toContainEqual(expect.objectContaining({type:'REFERENCED_ATTACHMENT_NOT_PRODUCED'}))
  })
  it('flags withholding language conservatively',()=>{
    const result=analyzeGovernmentCommunicationProduction([], [{id:'r1',filename:'response.pdf',text:'Certain emails are withheld as exempt.'}])
    expect(result.findings).toContainEqual(expect.objectContaining({type:'REDACTION_REVIEW'}))
  })
})
