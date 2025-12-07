# Feature Spec: 004 - Habit Library System

## 1. Overview
Upgrade the Official Habit Library with:
- **Three Difficulty Levels**: 入門 (Beginner) / 進階 (Intermediate) / 挑戰 (Challenge)
- **Dynamic Category Management**: CRUD for habit categories
- **Smart Import**: Auto-suggest difficulty based on phase order

---

## 2. Data Models

### 2.1 HabitCategory
```prisma
model HabitCategory {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String?  // Hex color for UI
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.2 OfficialHabit
```prisma
model OfficialHabit {
  id           String   @id @default(cuid())
  name         String   // 習慣集合名稱
  description  String?
  category     String   // Reference to category name
  icon         String?  // Emoji icon
  difficulties Json     // { beginner?, intermediate?, challenge? }
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 2.3 DifficultyConfig Schema
```typescript
interface DifficultyConfig {
  enabled: boolean;
  label: string;           // e.g., "入門版：喝 2 杯水"
  type: "binary" | "quantitative" | "checklist";
  dailyTarget?: number;
  unit?: string;
  stepValue?: number;
  subtasks?: Subtask[];
  recurrence: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
    periodTarget?: number;
    weekDays?: number[];
    endType: "never" | "count";
    endCount?: number;
  };
}
```

---

## 3. Admin UI Pages

### 3.1 Habits Management (`/admin/dashboard/habits`)
- List all habits with search and category filter
- 3-tab editor (入門 | 進階 | 挑戰)
- Each tab has enable toggle + config form
- At least one difficulty must be enabled

### 3.2 Category Management (`/admin/dashboard/habits/categories`)
- List categories with color indicators
- Add/Edit/Delete functionality
- Color picker with preset options

---

## 4. Template Integration

### 4.1 HabitLibraryModal
**Props:**
- `phaseOrder`: Current phase index (0-based)

**Features:**
- Fetch active habits from API
- Show enabled difficulties as selectable pills
- Auto-suggest difficulty based on phase:
  - Phase 1 (index 0) → 入門
  - Phase 2 (index 1) → 進階
  - Phase 3+ (index 2+) → 挑戰

### 4.2 Import Flow
1. User clicks "從習慣庫匯入" in a phase
2. Modal opens with suggested difficulty
3. User can override difficulty selection
4. Selected habits converted to task format with difficulty config

---

## 5. API Endpoints

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/categories` | List all categories |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/[id]` | Update category |
| DELETE | `/api/admin/categories/[id]` | Delete category |

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/habits` | List habits (filter: category, active) |
| POST | `/api/admin/habits` | Create habit with difficulties |
| PUT | `/api/admin/habits/[id]` | Update habit |
| DELETE | `/api/admin/habits/[id]` | Delete habit |

---

## 6. Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add HabitCategory, restructure OfficialHabit |
| `admin/habits/page.js` | 3-tab difficulty editor, category integration |
| `admin/habits/categories/page.js` | NEW: Category CRUD UI |
| `api/admin/categories/route.js` | NEW: Category API |
| `api/admin/categories/[id]/route.js` | NEW: Category [id] API |
| `api/admin/habits/route.js` | Handle difficulties structure |
| `api/admin/habits/[id]/route.js` | Handle difficulties structure |
| `HabitLibraryModal.jsx` | Difficulty selector, auto-suggest, category filter |
| `TemplateForm.jsx` | Pass phaseOrder to HabitLibraryModal |

---

## 7. Status
- [x] HabitCategory model and API
- [x] OfficialHabit difficulties structure
- [x] Habits Management UI (3-tab editor)
- [x] Category Management UI
- [x] HabitLibraryModal difficulty selector
- [x] Auto-suggest based on phase order
