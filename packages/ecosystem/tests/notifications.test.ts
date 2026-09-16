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
