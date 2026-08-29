import assert from 'node:assert/strict'
import test from 'node:test'
import {scoreOpportunity,canAdvance,requiresHumanApproval} from './foundry-contract.js'
import {evaluateQACouncil} from './qa-council.js'
import {authorizeFoundryAction} from './autonomy-policy.js'

test('opportunity scoring is bounded and weighted',()=>{const score=scoreOpportunity({demand:100,competition:50,differentiation:100,reuse:100,feasibility:100,risk:0});assert.equal(score.overall,90);assert.ok(score.overall<=100)})
test('quality council fails on blocker',()=>{const gate=evaluateQACouncil([{stage:'QA',reviewer:'security-qa',score:95,blockers:[]},{stage:'RED_TEAM',reviewer:'red-team',score:92,blockers:['unsafe action']}]);assert.equal(gate.status,'FAIL');assert.equal(gate.reviewer,'release-judge')})
test('release requires approval while ordinary research remains autonomous',()=>{assert.equal(requiresHumanApproval('DEPLOY'),true);assert.equal(authorizeFoundryAction('RESEARCH','search competitors').allowed,true);assert.equal(authorizeFoundryAction('DEPLOY','publish production').requiresHuman,true);assert.equal(canAdvance({stage:'VERIFY',status:'PASS',score:90,blockers:[],reviewer:'release-judge'}),true)})
