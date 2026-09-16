import assert from "node:assert/strict";
import test from "node:test";
import { runIdempotentWorkflowAction } from "../src/execution-reliability.js";

test("idempotent workflow action retries and replays completed results", async () => {
  let record:any=null;
  let calls=0;
  const store={
    async load(){return record;},
    async claim(key:string,now:string){if(record?.status==="running") return false;record={key,status:"running",attempts:0,updatedAt:now};return true;},
    async succeed(key:string,result:unknown,attempts:number,now:string){record={key,status:"succeeded",result,attempts,updatedAt:now};},
    async fail(key:string,error:string,attempts:number,now:string){record={key,status:"failed",error,attempts,updatedAt:now};},
  };
  const first=await runIdempotentWorkflowAction({
    key:"mail:m1",store,
    action:async(attempt)=>{calls+=1;if(attempt===1) throw new Error("temporary");return "ok";},
    policy:{maxAttempts:2,baseDelayMs:1,maxDelayMs:1},
    sleep:async()=>{},
    now:()=>"2026-09-16T00:00:00Z",
  });
  assert.deepEqual(first,{result:"ok",replayed:false,attempts:2});
  const replay=await runIdempotentWorkflowAction({key:"mail:m1",store,action:async()=>{calls+=1;return "bad";}});
  assert.deepEqual(replay,{result:"ok",replayed:true,attempts:2});
  assert.equal(calls,2);
});
