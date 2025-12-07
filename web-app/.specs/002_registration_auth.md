# Feature Spec: Registration and Authentication System

## 1. Overview
Implement secure registration and login flows for two distinct user types: **Clients (Users)** and **Experts**. 
- **Clients**: Mobile-first registration with SMS verification (simulated) + Password.
- **Experts**: Web-based registration with Email + Password, requiring Admin approval for public features.

## 2. User (Client) Authentication
### 2.1 Requirements
- **Identifier**: Mobile Phone (Format: `+886912345678`).
- **Auth Method**: Password (hashed).
- **Verification**: SMS Code (Simulated default: `8888`).
- **Profile**: Country Code selection required during signup.

### 2.2 Flows
- **Sign Up**:
    1. Input Phone + Country Code.
    2. Input Password.
    3. Input Verification Code (Client validates against mock `8888`).
    4. Call API to create User.
- **Login**:
    1. Input Phone + Password.
    2. API validates hash.
    3. Return JWT/Session (or simple cookie for MVP).

### 2.3 Schema Changes (`User` model)
- `countryCode`: String (e.g., "+886")
- `password`: String (Hashed)
- `phone`: Already exists, ensure uniqueness includes country code normalization if needed.

---

## 3. Expert Authentication
### 3.1 Requirements
- **Identifier**: Email.
- **Auth Method**: Password (hashed).
- **Role Management**:
    - `isActive`: Boolean (For generalized access).
    - `isApproved`: Boolean (New field). strictly for "Public Template" permission.
    - Default status upon registration: `isApproved = false`.

### 3.2 Flows
- **Sign Up**:
    1. Input Name, Title, Email, Password.
    2. Call API to create Expert.
    3. **Dashboard Access**: Allowed immediately (Can create private lists).
    4. **Public Access**: Restricted until `isApproved` is true.
- **Login**:
    1. Input Email + Password.
    2. API validates.

### 3.3 Schema Changes (`Expert` model)
- `email`: String @unique (Replace or add alongside `pin`?) -> **Replace PIN with Password**.
- `password`: String (Hashed).
- `isApproved`: Boolean @default(false).

---

## 4. Admin Guardrails
- **Experts List**: Admin can view all experts.
- **Approval Action**: Admin can toggle `isApproved` status for an expert.
- **Template Logic**:
    - If `Expert.isApproved === false`: Cannot set `isPublic = true` on templates.
    - UI should disable the "Public" checkbox with a tooltip: "Waiting for Admin approval".

## 5. Implementation Roadmap
1. **Database**: Update Schema (`User`, `Expert`).
2. **API**:
    - `POST /api/auth/register` (User)
    - `POST /api/auth/login` (User)
    - `POST /api/admin/auth/register` (Expert)
    - `POST /api/admin/auth/login` (Expert)
3. **UI (Client)**:
    - New `RegisterPage.jsx` (Mobile layout).
    - Update `LoginPage.jsx`.
4. **UI (Expert)**:
    - New `ExpertRegisterPage.jsx`.
    - Update `ExpertLoginPage.jsx`.
    - Update `TemplateForm.jsx` (Check approval status).
