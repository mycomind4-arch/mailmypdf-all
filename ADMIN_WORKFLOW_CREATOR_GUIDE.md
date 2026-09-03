# Admin Workflow Creator Guide

**Complete guide to creating new workflows + SEO landing pages from the admin dashboard**

---

## 🎯 Overview

The Admin Workflow Creator allows admins to:

1. **Select a vertical** (immigration, disputes, CP, etc.)
2. **Choose a workflow type** (appeal, FOIA request, response, etc.)
3. **Auto-generate complete workflow** (8 stages, AI prompts, documents)
4. **Auto-generate SEO landing page** (headlines, copy, keywords)
5. **Preview both** before publishing
6. **One-click publish** to make live

---

## 🚀 How to Use

### Step 1: Access Admin Dashboard

```
Navigate to: /admin/workflows/create
```

You'll see the three-step workflow creator.

### Step 2: Select Vertical

**Verticals Available:**

| Vertical | Description | Icon |
|----------|-------------|------|
| **Immigration Mail** | Government correspondence for immigration cases | 🌍 |
| **Dispute Mail** | Dispute resolution and debt collection responses | ⚠️ |
| **CP Correspondence** | IRS CP2000 and similar tax notices | 🧮 |
| **Appeal Mail** | Appeals for benefits and claims | ⚖️ |
| **Records Requests** | FOIA and public records requests | 📁 |
| **Housing Mail** | Landlord/tenant and housing disputes | 🏠 |

**Click to select a vertical.**

### Step 3: Select Workflow Type

After selecting a vertical, you'll see available workflow types.

**Example - Immigration Mail Workflows:**

| Workflow | Description | Complexity | Time |
|----------|-------------|-----------|------|
| USCIS Green Card Appeal | Appeal denied or delayed green card | Complex | 6h |
| Visa Application Response | Respond to visa interview questions | Moderate | 4h |
| FOIA Request to USCIS | Request immigration file or records | Simple | 2h |
| Advance Parole | Request travel document | Moderate | 3h |
| EAD/Work Permit | Request employment authorization | Moderate | 3h |

**Click to select a workflow type.**

### Step 4: Generate

Once you select:
- Vertical ✓
- Workflow Type ✓

Click the **"Generate Workflow"** button.

**What happens:**
1. Claude AI generates complete workflow (8 stages)
2. Claude AI generates SEO landing page copy
3. You move to the Preview step

---

## 👁️ Step 2: Preview

### Desktop & Mobile Preview

Toggle between **Desktop** and **Mobile** views to see how the landing page looks on different devices.

### Preview Shows:

**1. Landing Page:**
- Hero section with headline
- Features list
- Pricing
- CTA button
- Full page layout

**2. Landing Page Details:**
- Title
- Meta description
- SEO keywords
- Preview of each section

### Edit/Customize

If you want to modify the landing page copy:

1. Click **"Back"** to return to selection
2. Select different vertical/workflow
3. Get different AI-generated copy

(Or edit after publishing via database)

---

## ✅ Step 3: Publish

Once preview looks good, click **"Publish Workflow"**.

**What happens:**
1. Workflow spec saved to database
2. Landing page created
3. SEO metadata configured
4. Route created
5. Workflow goes live

**You'll see:**
- ✓ Confirmation message
- Live URL (e.g., `/immigration-mail/uscis-gc-appeal`)
- Links to view live page
- Option to create another

---

## 🎨 What Gets Generated

### Workflow Generation

**8 Pipeline Stages:**
1. **Intake** - Gather user information
2. **Research** - AI researches regulations
3. **Analysis** - AI analyzes case facts
4. **Strategy** - AI develops strategy
5. **Draft** - AI generates documents
6. **Review** - User reviews documents
7. **Assembly** - Package for delivery
8. **Approval** - Final sign-off

**For each stage:**
- Questions for users
- AI tasks
- Required outputs
- Success criteria
- Time estimate

### Landing Page Generation

**Includes:**
- ✓ Compelling headline
- ✓ Benefit-focused subheadline
- ✓ 6-8 feature benefits
- ✓ Pricing tier
- ✓ Call-to-action
- ✓ 10 SEO keywords
- ✓ 160-char meta description
- ✓ OG image description

---

## 📊 Real Examples

### Example 1: USCIS Green Card Appeal

**Selection:**
- Vertical: Immigration Mail
- Workflow: USCIS Green Card Appeal

**Generated Landing Page:**

```
Headline: "Appeal Your Denied Green Card Application"
Subheadline: "Professional legal counsel to overturn USCIS denials"

Features:
- Complete regulatory research for your case
- Analysis of why your application was denied
- Strategic appeal letter with supporting evidence
- Affidavit template from immigration attorney
- Evidence index organized by legal argument
- Mailing to correct USCIS office with tracking
- Follow-up strategy and timeline
- Money-back guarantee if standards not met

Pricing: $299-$499 depending on complexity
CTA: "Start Your Appeal"

SEO Keywords:
- USCIS appeal
- Green card appeal
- Denied green card
- Immigration appeal letter
- USCIS response
- I-485 appeal
- Green card denial
- Immigration attorney
- Green card lawyer
- Visa appeal
```

**Generated Workflow Stages:**
1. Intake: "Tell us about your case and denial"
2. Research: "Analyzing USCIS precedent..."
3. Analysis: "Evaluating your specific situation..."
4. Strategy: "Developing winning appeal..."
5. Draft: "Creating your appeal letter..."
6. Review: "You review and approve documents"
7. Assembly: "Preparing for certified delivery..."
8. Approval: "Final sign-off before mailing"

---

### Example 2: CP2000 Response

**Selection:**
- Vertical: CP Correspondence
- Workflow: CP2000 Response

**Generated Landing Page:**

```
Headline: "IRS CP2000 Response in 3 Days"
Subheadline: "Professional response to accuracy-related notices"

Features:
- Immediate analysis of your specific notice
- Regulation-based response strategy
- Verification of IRS calculations
- Supporting documentation for your position
- Professional IRS response letter
- Documentation of evidence
- Electronic filing with IRS
- Post-response tracking and support
```

---

## 🔄 Workflow After Publication

### User Journey

1. **User lands on:** `/immigration-mail/uscis-gc-appeal`
2. **Sees SEO landing page** with all the generated copy
3. **Clicks "Start Your Appeal"**
4. **Enters workflow**:
   - Stage 1: Answers intake questions
   - Stage 2: AI researches their case
   - Stage 3: AI analyzes their situation
   - Stage 4: AI develops strategy
   - Stage 5: AI generates documents
   - Stage 6: User reviews/approves
   - Stage 7: Documents packaged
   - Stage 8: Final approval, ready to send

---

## 📈 Metrics to Track

After publishing a workflow, monitor:

**Engagement:**
- Landing page views
- CTA clicks
- Workflow starts
- Completion rate

**Quality:**
- Completion time (average)
- User satisfaction (reviews)
- Document approval rate
- Revision requests

**Business:**
- Revenue per workflow
- Conversion rate
- Customer acquisition cost
- Lifetime value

---

## ⚙️ Configuration

### Adding New Workflow Types

Edit `WORKFLOW_TYPES` in `admin-workflow-creator.tsx`:

```typescript
const WORKFLOW_TYPES: Record<string, WorkflowType[]> = {
  "immigration-mail": [
    {
      id: "your-workflow-id",
      name: "Your Workflow Name",
      description: "What it does",
      complexity: "simple" | "moderate" | "complex",
      estimatedHours: 3,
      tags: ["tag1", "tag2"]
    }
  ]
}
```

### Adding New Verticals

Edit `VERTICALS` in `admin-workflow-creator.tsx`:

```typescript
const VERTICALS: Vertical[] = [
  {
    id: "your-vertical-id",
    name: "Your Vertical Name",
    description: "Description",
    icon: "IconName",
    color: "blue"
  }
]
```

---

## 🔒 Security & Permissions

### Admin-Only Access

The workflow creator is admin-only:

```typescript
// In route file
beforeLoad: async ({ context }) => {
  if (context.user?.role !== 'admin') {
    throw redirect({ to: '/unauthorized' });
  }
}
```

### Audit Trail

Every workflow creation is logged:

```
Action: workflow_generated
User: admin-user
Resource: workflow
Details: {
  verticalId: "immigration-mail",
  workflowName: "USCIS Green Card Appeal",
  timestamp: "2026-09-02T14:30:00Z"
}
```

---

## 🚨 Troubleshooting

### Generation Times Out

**Problem:** Workflow generation takes too long

**Solution:**
- Claude API may be slow
- Try again in a few minutes
- Check API status

### Landing Page Copy is Poor

**Problem:** Generated copy isn't compelling

**Solution:**
- Click "Back" and try different workflow
- AI generates different copy each time
- Or manually edit after publishing

### Workflow Won't Publish

**Problem:** Publish button returns error

**Solution:**
- Check database connection
- Verify admin permissions
- Check logs for specific error

---

## 💡 Best Practices

### 1. Test Before Publishing

Always preview both desktop and mobile before publishing.

### 2. Monitor Engagement

Check metrics after publishing to see if landing page is working.

### 3. Create Variations

Create multiple workflows per vertical to test messaging:
- Simple workflow → "Quick & Easy"
- Complex workflow → "Comprehensive"

### 4. Update Regularly

Periodically refresh workflows to update:
- Pricing
- Features
- Messaging
- Keywords

### 5. A/B Test

Create two versions of same workflow with different:
- Headlines
- CTAs
- Pricing
- Features

---

## 📚 Examples to Start With

### Recommended First Workflows

1. **Simple:** Immigration Mail → FOIA Request
   - Easiest to understand
   - Good template for others

2. **Moderate:** Immigration Mail → Visa Application Response
   - Mid-complexity
   - Common user problem

3. **Complex:** Immigration Mail → USCIS Green Card Appeal
   - Full workflow demonstration
   - Highest value

Start with one from each complexity level to understand the system.

---

## 🎯 Next Steps

1. **Access the admin dashboard** → `/admin/workflows/create`
2. **Select Immigration Mail** → Green Card Appeal
3. **Click Generate**
4. **Preview the results**
5. **Publish**
6. **View live workflow**

---

## 📞 Support

For issues or questions:

1. Check this guide first
2. Review error messages in browser console
3. Check server logs (admin dashboard)
4. Contact development team

---

**You're now ready to create professional workflows with AI-generated landing pages!** 🚀
