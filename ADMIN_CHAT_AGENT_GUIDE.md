# Admin Chat Agent Guide

**AI-Powered Platform Management via Natural Language**

---

## Overview

The Admin Chat Agent is a conversational interface built directly into the admin dashboard that allows you to manage the entire MailMyPDF platform using natural language commands. Instead of clicking through forms, you can simply describe what you want to do, and the agent interprets and executes your commands.

### Key Capabilities

- ✅ Add new workflows to any vertical
- ✅ Edit vertical properties and styling
- ✅ Customize landing pages
- ✅ Delete or update existing workflows
- ✅ Create new verticals
- ✅ List all workflows and verticals
- ✅ Mix and match Claude AI aspects

---

## Accessing the Chat Agent

### Entry Point
From the admin dashboard workflow creator, look for the **"Platform Agent"** tab or button that opens the chat interface.

### Authentication
The chat agent inherits your admin session authentication. You must:
1. Be logged in as admin (admin@mailmypdf.ai)
2. Have a valid session token
3. The token is automatically sent with each chat message

---

## Command Syntax

The chat agent understands **natural language** — you don't need to follow exact syntax. Here are examples of how to phrase commands:

### Adding Workflows

```
"Add a new workflow called 'USCIS N-600 Application' to immigration mail"

"Create a workflow for dispute mail that helps respond to debt collection"

"New appeal workflow: Student Loan Appeal"
```

### Editing Verticals

```
"Change the immigration mail vertical color to blue"

"Update dispute mail landing page headline to 'Fight Unfair Debt'"

"Edit the CP correspondence vertical description"
```

### Creating Landing Pages

```
"Create a new landing page for housing mail with orange color scheme"

"Generate landing page for appeal mail emphasizing speed and trust"

"Make a housing mail landing page with modern, friendly design"
```

### Listing & Viewing

```
"List all workflows in immigration mail"

"Show me all verticals"

"What workflows are available?"
```

### Deleting Workflows

```
"Delete the old CP2015 workflow from cp correspondence"

"Remove CP2000 Response from tax workflows"
```

### Advanced Operations

```
"Duplicate the USCIS appeal workflow to create a new one"

"Add Claude research aspect to all immigration workflows"

"Change the color scheme of all appeal workflows to green"
```

---

## How the Agent Processes Commands

### Step 1: Interpretation
Claude AI reads your natural language command and interprets it as a structured action:

```json
{
  "action": "add-workflow",
  "target": "workflow",
  "targetName": "USCIS N-600 Application",
  "vertical": "immigration-mail",
  "params": {
    "description": "Application response assistance"
  },
  "confidence": 0.95
}
```

### Step 2: Validation
The agent validates:
- Do you have permission to perform this action?
- Is the command clear and unambiguous?
- Are all required parameters specified?

If confidence is low, the agent asks for clarification:
```
"I'm not entirely sure what you mean. Could you be more specific? For example:
- 'Add a new workflow called X to immigration mail'
- 'Change the dispute mail landing page color to blue'"
```

### Step 3: Execution
The agent executes the validated command:
- Generates workflows with Claude AI
- Updates database records
- Creates landing pages
- Logs all actions for audit trail

### Step 4: Response
The agent confirms the action and shows its status:
```
✓ Successfully created the new workflow. I'll generate the AI workflow stages 
  and landing page for it.

Action Status: workflow-added (success)
```

---

## Available Actions

### Action: add-workflow
Create a new workflow in a vertical.

**Required:**
- Workflow name
- Vertical (immigration-mail, dispute-mail, cp-correspondence, appeal-mail, records-request, housing-mail)

**Optional:**
- Description
- Complexity level
- Custom constraints

**Example:**
```
"Add a new workflow called 'CP2025 Response' to cp correspondence for responding to IRS notices"
```

### Action: edit-vertical
Modify properties of an existing vertical.

**Required:**
- Vertical ID

**Optional:**
- Color
- Icon
- Description
- Display name

**Example:**
```
"Change the immigration mail vertical to use blue color and scales icon"
```

### Action: edit-landing-page
Customize the landing page for a vertical.

**Required:**
- Vertical ID

**Optional:**
- Headline
- Subheadline
- Features
- Call-to-action
- Color scheme

**Example:**
```
"Update the immigration mail landing page with a red button and security emphasis"
```

### Action: list-workflows
View all workflows, optionally filtered by vertical.

**Optional:**
- Vertical ID (to filter)

**Example:**
```
"List all workflows in dispute mail"
```

### Action: list-verticals
View all available verticals.

**Example:**
```
"Show me all verticals on the platform"
```

### Action: delete-workflow
Remove a workflow from the platform.

**Required:**
- Workflow name
- Vertical ID

**Example:**
```
"Delete the USCIS Green Card Appeal workflow from immigration mail"
```

### Action: create-vertical
Add an entirely new vertical (major feature category).

**Required:**
- Vertical name

**Optional:**
- Description
- Icon
- Color scheme

**Example:**
```
"Create a new vertical called 'Student Loans' for handling student loan disputes"
```

### Action: update-workflow
Modify an existing workflow's properties.

**Required:**
- Workflow name
- Vertical ID

**Optional:**
- New name
- Description
- Aspects

**Example:**
```
"Update the USCIS appeal workflow to include research and analysis aspects"
```

---

## Command Examples by Use Case

### Scenario 1: Launch New Vertical
```
Admin: "Create a new vertical called 'Student Loans' for student loan disputes"

Agent: ✓ New vertical created and ready for workflows.

Admin: "Add a workflow called 'Student Loan Dispute Response' to student loans"

Agent: ✓ Successfully created the new workflow. I'll generate the AI workflow 
       stages and landing page for it.

Admin: "Create a landing page for student loans with a friendly, empowering tone"

Agent: ✓ The landing page has been updated with your changes.
```

### Scenario 2: AB Test Landing Pages
```
Admin: "Create a version A landing page for immigration mail emphasizing speed"

Agent: ✓ The landing page has been updated with your changes.

Admin: "Create a version B for immigration with security and expertise emphasis"

Agent: ✓ The landing page has been updated with your changes.

Admin: "List all immigration workflows to see the variants"

Agent: ✓ Retrieved workflows in immigration-mail
        [Shows list of workflows]
```

### Scenario 3: Consolidate Old Workflows
```
Admin: "What old workflows do we have in cp correspondence?"

Agent: ✓ Retrieved workflows in cp-correspondence
        [Shows CP2000, CP2015, CP2020]

Admin: "Delete CP2015 from cp correspondence"

Agent: ✓ The workflow has been removed from the platform.

Admin: "Remove CP2020 as well"

Agent: ✓ The workflow has been removed from the platform.
```

### Scenario 4: Enhance with AI Aspects
```
Admin: "Show available Claude aspects for workflows"

Agent: [Lists all aspects from all verticals with descriptions]

Admin: "Add immigration research and case analysis aspects to the USCIS workflow"

Agent: ✓ Workflow updated successfully.
```

---

## Error Handling & Clarity

### When the Agent Isn't Sure
```
Admin: "Update immigration stuff"

Agent: I'm not entirely sure what you want to do. Could you be more specific? 
       For example:
       - "Add a new workflow called 'X' to immigration mail"
       - "Change the immigration mail landing page color to blue"
       - "List all workflows in appeal mail"
```

**Solution:** Be specific about:
- What action (add, edit, delete, list)
- What resource (workflow, vertical, landing page)
- Exact names or IDs

### When Validation Fails
```
Admin: "Add a workflow to a vertical I just created"

Agent: I encountered an issue: Please specify both workflow name and vertical
       Please try again with more details.
```

**Solution:** Provide:
- Workflow name (not just "a workflow")
- Vertical ID or name (not just "a vertical")

### When Action Succeeds
```
Admin: "Create GDPR compliance workflow for housing mail"

Agent: ✓ Successfully created the new workflow. I'll generate the AI workflow 
       stages and landing page for it.
       
       Action: workflow-added
       Status: success
```

---

## Integration with Claude Aspects

The agent can add Claude AI capabilities to workflows:

### Available Aspects by Vertical

**Immigration Mail:**
- USCIS Research
- Case Analysis
- Immigration Strategy
- Appeal Letter Generation

**Dispute Mail:**
- Dispute Law Research
- Debt Analysis
- Dispute Strategy
- Dispute Letter

**CP Correspondence:**
- IRS Research
- Tax Analysis
- Tax Strategy
- IRS Response Letter

**Appeal Mail:**
- Appeal Research
- Appeal Strength Analysis
- Appeal Strategy
- Appeal Letter

**Records Requests:**
- Records Research
- Records Targeting
- FOIA Letter

**Housing Mail:**
- Housing Law Research
- Housing Analysis
- Housing Response Letter

### Adding Aspects via Chat

```
"Add research and strategy aspects to the immigration appeal workflow"

"Include all available aspects in the CP2000 response workflow"

"Add case analysis aspect to dispute mail workflows"
```

---

## Quick Commands (Buttons)

Below the chat input are quick-action buttons for common tasks:

- **Add Workflow** — Pre-fills: "Add a new workflow to immigration mail called CP2025 Response"
- **Edit Vertical** — Pre-fills: "Change the immigration mail vertical color to blue"
- **New Landing Page** — Pre-fills: "Create a new landing page for appeal mail with green theme"
- **View Workflows** — Pre-fills: "List all available workflows and their status"

Click any button to send that command, then edit it before confirming.

---

## Message History & Context

The agent remembers the conversation history, so you can:

```
Admin: "Add a workflow to immigration mail"

Agent: I'm not entirely sure. Could you specify the workflow name?

Admin: "Call it USCIS N-600"

Agent: ✓ Successfully created the new workflow...
```

The agent uses context to understand follow-up commands.

---

## Audit & Logging

Every command executed by the agent is logged:

- **What:** The action performed (add-workflow, edit-vertical, etc.)
- **Who:** Your admin email (admin@mailmypdf.ai)
- **When:** Timestamp of execution
- **Result:** Success or failure status
- **Details:** Parameters and outcome

Audit logs are available in the admin panel for compliance and monitoring.

---

## Tips for Best Results

### 1. Be Natural
You don't need technical syntax. Just describe what you want:

❌ "action=add-workflow&target=vertical&name=X"  
✅ "Add a workflow called X to immigration mail"

### 2. Be Specific
Provide exact names and avoid ambiguity:

❌ "Change something about immigration"  
✅ "Change the immigration mail landing page headline to 'Professional Appeals'"

### 3. Use Complete Names
Reference the full workflow/vertical names:

❌ "Update the appeal"  
✅ "Update the USCIS Green Card Appeal workflow"

### 4. Test Iteratively
Create, preview, and refine:

```
Admin: "Add CP2025 workflow to immigration"
Agent: ✓ Created

Admin: "List immigration workflows"
Agent: [Shows list including new one]

Admin: "Change CP2025 headline to 'Quick IRS Response'"
Agent: ✓ Updated
```

### 5. Combine Operations
You can chain multiple commands in one chat:

```
Admin: "Create new workflow X for immigration mail, then add research 
       and analysis aspects, and make the landing page blue themed"

Agent: [Executes all three operations]
```

---

## Session & Security

### Session Management
- Sessions last **1 hour** (default, configurable)
- Automatic logout on session expiration
- One session per admin login

### Rate Limiting
- Chat agent requests are rate-limited: **100 per minute**
- Prevents abuse and ensures stability

### Audit Trail
- All operations logged with timestamp
- Admin email and IP recorded
- Searchable audit log in admin panel

---

## Troubleshooting

### "I'm not entirely sure what you want to do"
**Cause:** Low confidence in command interpretation  
**Fix:** Be more specific about the action and resource

### "Unauthorized"
**Cause:** Session token missing or expired  
**Fix:** Login again with admin credentials

### "Method not allowed"
**Cause:** Non-POST request to API endpoint  
**Fix:** This is handled automatically; if you see this, reload the page

### Chat not responding
**Cause:** Network issue or server error  
**Fix:** Check browser console for errors; try again after a few seconds

### Changes not appearing
**Cause:** Cache or race condition  
**Fix:** Refresh the admin dashboard after agent confirms success

---

## Advanced: Workflow Generation Details

When you create a workflow via the agent, here's what happens:

1. **Claude AI Design**
   - Analyzes the workflow name and vertical
   - Designs all 8 stages: Intake → Research → Analysis → Strategy → Draft → Review → Assembly → Approval
   - Generates intake forms and AI prompts

2. **Landing Page Generation**
   - Creates headline and subheadline
   - Lists 6-8 key features
   - Generates pricing tier
   - Writes SEO keywords and meta description
   - Produces call-to-action copy

3. **Database Persistence**
   - Stores workflow specification
   - Saves landing page content
   - Assigns workflow ID and URL

4. **Route Creation**
   - Makes workflow accessible at `/vertical-id/workflow-id`
   - Landing page lives at `/vertical-id/workflow-id/landing`

---

## What's Next?

The chat agent will continue to evolve with:
- [ ] Bulk operations ("Delete all old CP workflows")
- [ ] Conditional logic ("If X workflow exists, then...")
- [ ] Template library ("Clone immigration workflow to appeal mail")
- [ ] A/B testing integration ("Create test variant of landing page")
- [ ] Performance analytics ("Show me highest-converting workflows")

---

## Support & Questions

For issues or feature requests:
1. Check the troubleshooting section above
2. Review audit logs for failed operations
3. Contact support with chat history and admin email

---

**Your platform, managed naturally. Let the agent handle it.** 🤖

