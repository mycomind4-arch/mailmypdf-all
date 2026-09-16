import assert from "node:assert/strict";
import test from "node:test";
import { dispatchNotification, isNotificationDue, scheduleDeadlineReminder } from "../src/notifications.js";

test("notification dispatch is idempotent", async () => {
  let sends=0;
  const delivered=new Set<string>();
  const store={
    async wasDelivered(key:string){return delivered.has(key);},
    async record(input:any){if(input.status==="delivered") delivered.add(input.idempotencyKey);},
  };
  const provider={name:"test",isConfigured:()=>true,async send(){sends+=1;return {ok:true,messageId:"m1"};}};
  const command={idempotencyKey:"matter:1:mailed",kind:"mailed" as const,channel:"email" as const,message:{to:"a@example.com",subject:"Mailed",html:"<p>Mailed</p>"}};
  assert.equal((await dispatchNotification(command,provider,store)).status,"delivered");
  assert.equal((await dispatchNotification(command,provider,store)).status,"duplicate");
  assert.equal(sends,1);
});

test("deadline reminders produce deterministic due times", () => {
  const schedule=scheduleDeadlineReminder({
    id:"r1",deadlineAt:"2026-09-20T12:00:00Z",leadTimeMs:24*60*60*1000,
    command:{idempotencyKey:"r1",kind:"deadline_reminder",channel:"email",message:{to:"a@example.com",subject:"Due",html:"Due"}},
  });
  assert.equal(schedule.dueAt,"2026-09-19T12:00:00.000Z");
  assert.equal(isNotificationDue(schedule,Date.parse("2026-09-19T12:00:00Z")),true);
});


test("due notification dispatcher records durable completion", async () => {
  const { dispatchDueNotifications } = await import("../src/notifications.js");
  const delivered=new Set<string>();
  const completed:string[]=[];
  const schedule={
    id:"s1",dueAt:"2026-09-16T10:00:00Z",status:"scheduled" as const,
    command:{idempotencyKey:"s1",kind:"deadline_reminder" as const,channel:"email" as const,message:{to:"a@example.com",subject:"Due",html:"Due"}},
  };
  const result=await dispatchDueNotifications({
    schedules:{
      async listDue(){return [schedule];},
      async markDelivered(id){completed.push(id);},
      async markFailed(){throw new Error("should not fail");},
    },
    deliveries:{
      async wasDelivered(key){return delivered.has(key);},
      async record(input){if(input.status==="delivered") delivered.add(input.idempotencyKey);},
    },
    providers:{resolve(){return {name:"test",isConfigured:()=>true,async send(){return {ok:true,messageId:"m1"};}};}},
    now:"2026-09-16T10:00:00Z",
  });
  assert.deepEqual(result,{processed:1,delivered:1,failed:0,skipped:0,duplicates:0});
  assert.deepEqual(completed,["s1"]);
});
