# Feature Spec: 003 - Three-Layer Template Structure & Phase System

## 1. Overview
Upgrade the template system from a flat task array to a hierarchical 3-layer structure:
- **Plan** → **Phase** → **Task**

This enables:
- Progressive habit formation (e.g., Week 1: Foundation, Week 2: Build)
- Automatic task scheduling based on phase duration
- Clear visual grouping in client UI

---

## 2. Data Model Changes

### 2.1 Template Model
```prisma
model Template {
  id             String       @id @default(cuid())
  expertId       String
  name           String
  description    String?
  category       String       // health, fitness, nutrition, mental
  isPublic       Boolean      @default(false)
  
  // NEW: Start Date Configuration
  startDateType  String       @default("user_choice")  // "user_choice" | "fixed_date"
  fixedStartDate DateTime?    // Only used when startDateType === "fixed_date"
  
  // NEW: 3-Layer Structure
  tasks          Json         // Format: { version: "2.0", phases: [...] }
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  assignments    Assignment[]
}
```

### 2.2 Template.tasks JSON Schema (v2.0)
```typescript
interface TemplateTasksV2 {
  version: "2.0";
  phases: Phase[];
}

interface Phase {
  id: string;
  name: string;           // e.g., "階段 1：建立基礎"
  days: number;           // Duration in days (e.g., 7)
  tasks: TaskDefinition[];
}

interface TaskDefinition {
  id: string;
  title: string;
  details?: string;
  type: "binary" | "quantitative" | "checklist";
  category: string;
  frequency: "daily" | "weekly" | "monthly";
  time?: string;          // e.g., "09:00"
  dailyTarget?: number;   // For quantitative tasks
  unit?: string;          // e.g., "杯", "分鐘"
  stepValue?: number;     // Increment/decrement value
  subtasks?: Subtask[];
  recurrence: RecurrenceConfig;
}
```

### 2.3 Task Model (Instance)
```prisma
model Task {
  // ... existing fields ...
  
  // NEW: Phase Metadata
  metadata     Json?    // Stores phase info when task is created from template
}
```

**Metadata JSON Schema:**
```typescript
interface TaskMetadata {
  phaseId?: string;
  phaseName?: string;
  phaseOrder?: number;      // 0-indexed
  phaseDays?: number;
  phaseStartDate?: string;  // ISO date string
}
```

---

## 3. Recurrence Configuration

### 3.1 Unified Recurrence Schema
```typescript
interface RecurrenceConfig {
  type: "once" | "daily" | "weekly" | "monthly";
  interval: number;                    // Every N days/weeks/months
  
  // Weekly options
  mode?: "specific_days" | "period_count";
  weekDays?: number[];                 // 0=Sunday, 6=Saturday
  
  // Monthly options
  monthType?: "date" | "weekday";
  
  // Period goals
  periodTarget?: number;               // e.g., 3 times per week
  dailyLimit?: boolean;                // Only count once per day
  
  // End conditions
  endType: "never" | "count" | "date";
  endCount?: number;                   // End after X occurrences
  endDate?: string;                    // End on specific date (ISO)
}
```

### 3.2 Template Mode Restrictions
When editing tasks in **template mode** (expert backend):

| Setting | Available | Reason |
|---------|-----------|--------|
| Frequency (daily/weekly/monthly) | ✅ | Universal setting |
| Week days | ✅ | Universal setting |
| Period target | ✅ | Universal setting |
| End type: never | ✅ | Universal setting |
| End type: count | ✅ | Relative to user's join date |
| End type: date | ❌ | Fixed date doesn't make sense for templates |
| Start date | ❌ | Calculated from plan start + phase duration |

---

## 4. Start Date Logic

### 4.1 Plan-Level Configuration (Expert Backend)
Experts set `startDateType` on the template:

| Type | Behavior |
|------|----------|
| `user_choice` (default) | User selects start date when joining |
| `fixed_date` | All users start on the specified date |

### 4.2 User Join Flow (Client)
When user joins a template with `startDateType === "user_choice"`:

1. Show date selection modal:
   - 今天開始 (Today)
   - 明天開始 (Tomorrow)
   - 指定日期 (Custom date)

2. Selected date becomes `planStartDate`

### 4.3 Phase Start Date Calculation
```javascript
// When user joins a plan
const planStartDate = userSelectedDate || template.fixedStartDate || today;

let cumulativeDays = 0;
phases.forEach((phase, index) => {
  const phaseStartDate = addDays(planStartDate, cumulativeDays);
  
  phase.tasks.forEach(task => {
    createTask({
      ...task,
      date: phaseStartDate,
      metadata: {
        phaseName: phase.name,
        phaseOrder: index,
        phaseDays: phase.days,
        phaseStartDate: formatDate(phaseStartDate)
      }
    });
  });
  
  cumulativeDays += phase.days;
});
```

---

## 5. UI Components

### 5.1 Admin Dashboard: TemplateForm
**Location:** `/admin/dashboard/templates/components/TemplateForm.jsx`

**Features:**
- Phase management (add/remove/edit phases)
- Phase duration (days) setting
- Task editor within each phase
- Start date type selector
- Collapsible phase sections

### 5.2 Admin Dashboard: TaskFormModal (Template Mode)
**Prop:** `templateMode={true}`

**Hidden Elements:**
- Start date picker (date is calculated automatically)
- End type: "date" option

### 5.3 Client: TemplateExplorer
**Location:** `/components/TemplateExplorer.jsx`

**Features:**
- Browse public templates
- Start date selection modal (for user_choice templates)
- Join confirmation

### 5.4 Client: PlanGroup
**Location:** `/components/PlanGroup.jsx`

**Features:**
- Group tasks by phase
- Show phase headers with:
  - Phase number (1, 2, 3...)
  - Phase name
  - Duration (X days)
  - Status indicator (active/future)
- Future phases shown with reduced opacity + "尚未開始" label

---

## 6. API Endpoints

### 6.1 User Assignment API
**POST** `/api/user/assignments`

**Request:**
```json
{
  "userId": "string",
  "templateId": "string",
  "startDate": "2024-01-15"  // NEW: Optional, for user_choice templates
}
```

**Logic:**
1. Fetch template with expert info
2. Determine start date (request > template.fixedStartDate > today)
3. Parse template.tasks (handle v1.0 flat array and v2.0 phases)
4. Calculate phase start dates
5. Create tasks with metadata

### 6.2 Admin Assignment API
**POST** `/api/admin/assignments`

Same logic as user API, but with `isLocked: true` for expert-assigned tasks.

---

## 7. Migration & Backward Compatibility

### 7.1 Legacy Format Detection
```javascript
const rawTasks = template.tasks;

if (Array.isArray(rawTasks)) {
  // Legacy v1.0: Flat array of tasks
  // Wrap in single phase for compatibility
} else if (rawTasks.version === "2.0") {
  // New v2.0: Extract from phases
}
```

### 7.2 Legacy Template Handling
When editing a legacy template:
- Wrap existing tasks in a single phase named "主階段"
- Set phase duration to 30 days (default)
- Save in v2.0 format going forward

---

## 8. Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `startDateType`, `fixedStartDate` to Template; Add `metadata` to Task |
| `TemplateForm.jsx` | 3-layer UI, start date setting, phase management |
| `TaskFormModal.jsx` | Add `templateMode` prop, hide date picker, add "count" end type |
| `TemplateExplorer.jsx` | Start date selection modal |
| `PlanGroup.jsx` | Group tasks by phase with headers |
| `user/assignments/route.js` | Accept startDate, calculate phase dates, store metadata |
| `admin/assignments/route.js` | Same phase calculation logic |

---

## 9. Status
- [x] 3-Layer Template Structure (Plan > Phase > Task)
- [x] Phase Management UI (Admin)
- [x] Start Date Configuration (Plan-level)
- [x] User Date Selection (Today/Tomorrow/Custom)
- [x] Phase Display (Client)
- [x] Recurrence Settings Alignment
- [x] Template Mode Restrictions (TaskFormModal)
- [x] Backward Compatibility (v1.0 → v2.0)
