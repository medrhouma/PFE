# 🏢 HR PLATFORM - COMPLETE ARCHITECTURE & IMPLEMENTATION GUIDE

## 📋 DATABASE SCHEMA ANALYSIS

Based on your Prisma schema, you have:
- ✅ **User Management**: User, Employe, Role, Permission, RolePermission
- ✅ **Leave Management**: DemandeConge with proper status workflow
- ✅ **Attendance**: Pointage with photo capture, device fingerprinting, anomaly detection
- ✅ **Notifications**: Notification table with types and priorities
- ✅ **Audit**: AuditLog for traceability
- ✅ **RH Decisions**: RHDecision for tracking approvals/rejections
- ✅ **Anomalies**: Anomaly detection system
- ✅ **Device Security**: DeviceFingerprint for security

---

## 🎯 CRITICAL ISSUES TO FIX

### Issue #1: Leave Requests Not Notifying RH
**Problem**: When user submits leave, RH doesn't receive notifications
**Root Cause**: Notification service is being called but not properly creating notifications for RH users

### Issue #2: RH Dashboard Empty
**Problem**: RH can't see leave requests from other users
**Root Cause**: API endpoint only returns current user's leaves, not all leaves

### Issue #3: Cross-Session Sync
**Problem**: Notifications don't appear in real-time across sessions
**Root Cause**: No WebSocket/SSE implementation, relying on polling only

---

## ✅ COMPLETE LEAVE REQUEST WORKFLOW

### 1. Backend Flow Diagram

```
USER SUBMITS LEAVE REQUEST
    ↓
[POST /api/conges]
    ↓
Validate: dates, type, user status
    ↓
Generate unique ID
    ↓
INSERT INTO demande_conge
    status = 'EN_ATTENTE'
    userId = session.user.id
    type, dateDebut, dateFin, commentaire
    ↓
INSERT INTO audit_logs
    action = 'LEAVE_REQUEST_SUBMITTED'
    userId, metadata (type, dates, duration)
    ↓
QUERY: Get all RH + SUPER_ADMIN users
    WHERE role IN ('RH', 'SUPER_ADMIN')
    AND status = 'ACTIVE'
    ↓
FOR EACH RH/Admin:
    INSERT INTO notifications
        user_id = rh.id
        type = 'LEAVE_REQUEST'
        title = 'Nouvelle demande de congé'
        message = '{userName} a demandé {X} jours'
        priority = 'NORMAL'
        is_read = 0
        ↓
    [Optional] Trigger real-time push via WebSocket
    ↓
RETURN success response to user
```

### 2. RH Approval/Rejection Flow

```
RH REVIEWS REQUEST
    ↓
[PATCH /api/conges/[id]]
    ↓
Verify: user.role IN ('RH', 'SUPER_ADMIN')
    ↓
Get request from demande_conge
    ↓
UPDATE demande_conge
    SET status = 'VALIDE' | 'REFUSE'
    SET commentaire = rhComment
    ↓
INSERT INTO rh_decisions
    deciderId = session.user.id
    entityType = 'DEMANDE_CONGE'
    entityId = requestId
    decision = 'APPROVED' | 'REJECTED'
    comments = rhComment
    ↓
INSERT INTO audit_logs
    action = 'LEAVE_REQUEST_' + decision
    userId = deciderId
    targetUserId = requestOwnerId
    ↓
INSERT INTO notifications (for user)
    user_id = requestOwnerId
    type = decision == 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED'
    title = decision message
    priority = 'HIGH'
    ↓
INSERT INTO notifications (for Super Admins)
    Notify all SUPER_ADMIN about RH decision
    ↓
RETURN success response
```

---

## ✅ COMPLETE ATTENDANCE WORKFLOW

### 1. Check-In/Out with Photo Capture

```
USER CLICKS "POINTER"
    ↓
Frontend: Request camera permissions
    ↓
Capture photo (base64)
    ↓
Get geolocation
    ↓
Generate device fingerprint (browser, OS, screen)
    ↓
[POST /api/pointage]
    body: {
        type: 'IN' | 'OUT',
        capturedPhoto: base64,
        geolocation: { lat, lng },
        deviceFingerprint: hash
    }
    ↓
Backend validates:
    - User is ACTIVE
    - Photo is provided
    - Valid check-in/out sequence
    ↓
Check device fingerprint:
    - Match existing or create new
    - Flag if new device
    ↓
INSERT INTO pointages
    userId, type, timestamp
    deviceFingerprintId
    capturedPhoto (base64)
    ipAddress, geolocation
    faceVerified = false (pending)
    status = 'VALID'
    ↓
[Background Job] Face Verification:
    - Compare with user.image or employe.photo
    - Calculate verificationScore
    - UPDATE pointages SET faceVerified, verificationScore
    ↓
Anomaly Detection:
    - Check unusual time
    - Check location drift
    - Check device change
    - Check duplicate entries
    ↓
IF anomaly detected:
    UPDATE pointages SET anomalyDetected = true
    INSERT INTO anomalies
        pointageId, type, severity, description
    ↓
    INSERT INTO notifications (for RH + SUPER_ADMIN)
        type = 'POINTAGE_ANOMALY'
        message = 'Anomalie détectée pour {userName}'
        priority = 'HIGH'
        ↓
INSERT INTO audit_logs
    action = 'POINTAGE_' + type
    userId, metadata
    ↓
IF normal:
    INSERT INTO notifications (for user)
        type = 'POINTAGE_SUCCESS'
        title = 'Pointage enregistré'
        priority = 'NORMAL'
        ↓
RETURN success with pointage details
```

### 2. Anomaly Detection Rules

```javascript
// Rule 1: Unusual Time
if (timestamp.hour < 6 || timestamp.hour > 23) {
    createAnomaly('UNUSUAL_TIME', 'HIGH', 'Pointage en dehors des heures normales')
}

// Rule 2: Location Drift
if (distance(currentLocation, lastLocation) > 50km) {
    createAnomaly('LOCATION_DRIFT', 'HIGH', 'Localisation inhabituelle')
}

// Rule 3: Device Change
if (deviceFingerprint !== user.lastDeviceFingerprint) {
    createAnomaly('DEVICE_CHANGE', 'MEDIUM', 'Nouvel appareil détecté')
}

// Rule 4: Rapid Check-In/Out
if (timeSinceLastPointage < 30minutes) {
    createAnomaly('RAPID_ENTRY', 'MEDIUM', 'Pointages trop rapprochés')
}

// Rule 5: Face Verification Failed
if (verificationScore < 70) {
    createAnomaly('FACE_MISMATCH', 'HIGH', 'Visage non reconnu')
}

// Rule 6: Missing Check-Out
if (type === 'IN' && lastPointage.type === 'IN') {
    createAnomaly('MISSING_CHECKOUT', 'LOW', 'Sortie non enregistrée')
}
```

---

## ✅ PROFESSIONAL NOTIFICATION SYSTEM

### 1. Notification Schema (Already in DB)

```sql
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type ENUM('LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 
              'PROFILE_APPROVED', 'PROFILE_REJECTED', 'PROFILE_SUBMITTED',
              'POINTAGE_SUCCESS', 'POINTAGE_ANOMALY', 'RH_ACTION_REQUIRED',
              'SYSTEM_ALERT', 'DEVICE_CHANGE') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_priority (priority, created_at),
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);
```

### 2. Notification Types & Targeting

| Type | Target | Priority | When |
|------|--------|----------|------|
| LEAVE_REQUEST | RH, SUPER_ADMIN | NORMAL | User submits leave |
| LEAVE_APPROVED | User | HIGH | RH approves leave |
| LEAVE_REJECTED | User | HIGH | RH rejects leave |
| PROFILE_SUBMITTED | RH, SUPER_ADMIN | NORMAL | User completes profile |
| PROFILE_APPROVED | User | HIGH | RH approves profile |
| PROFILE_REJECTED | User | HIGH | RH rejects profile |
| POINTAGE_SUCCESS | User | NORMAL | Normal check-in/out |
| POINTAGE_ANOMALY | RH, SUPER_ADMIN, User | HIGH | Anomaly detected |
| DEVICE_CHANGE | RH, SUPER_ADMIN | MEDIUM | New device detected |
| RH_ACTION_REQUIRED | RH, SUPER_ADMIN | NORMAL | Pending actions |
| SYSTEM_ALERT | All roles | URGENT | System-wide alerts |

### 3. Real-Time Delivery Options

**Option A: Polling (Current - Simple)**
```javascript
// Frontend polls every 30 seconds
setInterval(() => {
    fetch('/api/notifications')
}, 30000)
```

**Option B: Server-Sent Events (SSE - Recommended)**
```javascript
// Backend: /api/notifications/stream
export async function GET(req: Request) {
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    
    // Keep connection alive and push notifications
    const interval = setInterval(async () => {
        const notifications = await getNewNotifications(userId)
        if (notifications.length > 0) {
            await writer.write(`data: ${JSON.stringify(notifications)}\\n\\n`)
        }
    }, 5000)
    
    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    })
}

// Frontend
const eventSource = new EventSource('/api/notifications/stream')
eventSource.onmessage = (event) => {
    const notifications = JSON.parse(event.data)
    updateNotificationUI(notifications)
}
```

**Option C: WebSocket (Most Real-Time)**
```javascript
// Use Socket.io or native WebSocket
const io = new Server(server)

io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId
    
    // Join user-specific room
    socket.join(`user:${userId}`)
    
    // Listen for new notifications from database
    notificationEmitter.on('new', (notification) => {
        if (notification.userId === userId) {
            socket.emit('notification', notification)
        }
    })
})

// When creating notification
await createNotification(data)
notificationEmitter.emit('new', notification)
```

---

## ✅ ROLES & PERMISSIONS SYSTEM

### 1. Role Matrix

| Feature | USER | RH | SUPER_ADMIN |
|---------|------|-----|-------------|
| Submit Leave | ✅ | ✅ | ✅ |
| View Own Leaves | ✅ | ✅ | ✅ |
| View All Leaves | ❌ | ✅ | ✅ |
| Approve/Reject Leaves | ❌ | ✅ | ✅ |
| Check-In/Out | ✅ | ✅ | ✅ |
| View Own Pointages | ✅ | ✅ | ✅ |
| View All Pointages | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ✅ | ✅ |
| Approve Employee Profiles | ❌ | ✅ | ✅ |
| View Anomalies | ❌ | ✅ | ✅ |
| Manage Roles/Permissions | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ✅ | ✅ |

### 2. Middleware Implementation

```typescript
// middleware/rbac.ts
export function requireRole(...allowedRoles: Role[]) {
    return async (req: NextRequest) => {
        const session = await getServerSession(authOptions)
        
        if (!session) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }
        
        if (!allowedRoles.includes(session.user.roleEnum)) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
        
        // Check if user is ACTIVE
        if (session.user.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Compte inactif' }, { status: 403 })
        }
        
        return null // Continue
    }
}

// Usage in API routes
export async function POST(req: NextRequest) {
    const authError = await requireRole('RH', 'SUPER_ADMIN')(req)
    if (authError) return authError
    
    // Continue with protected logic
}
```

### 3. Permission-Based Access

```typescript
// For granular permissions
async function checkPermission(
    userId: string,
    module: string,
    action: PermissionAction
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    rolePermissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            }
        }
    })
    
    return user?.role?.rolePermissions.some(rp =>
        rp.permission.module === module &&
        rp.permission.action === action
    ) || false
}

// Usage
if (!await checkPermission(userId, 'RH', 'VALIDATE')) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
}
```

---

## ✅ AUDIT & TRACEABILITY

### 1. What to Audit

```typescript
enum AuditAction {
    // Authentication
    'LOGIN',
    'LOGOUT',
    'PASSWORD_CHANGED',
    
    // Leave Management
    'LEAVE_REQUEST_SUBMITTED',
    'LEAVE_REQUEST_APPROVED',
    'LEAVE_REQUEST_REJECTED',
    'LEAVE_REQUEST_CANCELLED',
    
    // Attendance
    'POINTAGE_IN',
    'POINTAGE_OUT',
    'POINTAGE_ANOMALY_DETECTED',
    
    // User Management
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_STATUS_CHANGED',
    'PROFILE_APPROVED',
    'PROFILE_REJECTED',
    
    // Role/Permission
    'ROLE_ASSIGNED',
    'PERMISSION_GRANTED',
    'PERMISSION_REVOKED',
    
    // System
    'SETTINGS_CHANGED',
    'DEVICE_REGISTERED',
    'ANOMALY_REVIEWED'
}
```

### 2. Audit Log Service

```typescript
// lib/services/audit-logger.ts
export class AuditLogger {
    async log(params: {
        action: AuditAction
        userId: string
        targetUserId?: string
        entityType?: string
        entityId?: string
        metadata?: any
        ipAddress?: string
        userAgent?: string
    }) {
        await query(
            `INSERT INTO audit_logs (
                id, user_id, action, target_user_id, entity_type, entity_id,
                metadata, ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                params.userId,
                params.action,
                params.targetUserId || null,
                params.entityType || null,
                params.entityId || null,
                params.metadata ? JSON.stringify(params.metadata) : null,
                params.ipAddress || null,
                params.userAgent || null
            ]
        )
    }
}

// Usage
await auditLogger.log({
    action: 'LEAVE_REQUEST_APPROVED',
    userId: session.user.id,
    targetUserId: requestOwnerId,
    entityType: 'DEMANDE_CONGE',
    entityId: requestId,
    metadata: { type: 'MALADIE', duration: 5 }
})
```

---

## ✅ PROFESSIONAL DASHBOARD DESIGNS

### 1. USER Dashboard

**Sections:**
- 📊 **Quick Stats Cards**
  - Congés approuvés (cette année)
  - Congés en attente
  - Jours de pointage (ce mois)
  - Anomalies détectées

- 📅 **Calendar View**
  - Upcoming leaves
  - Company holidays
  - Team absences

- ⏱️ **Quick Actions**
  - Pointer (IN/OUT with camera)
  - Demander un congé
  - Consulter mes documents

- 📜 **Recent Activity**
  - Last pointages
  - Leave request status
  - Document uploads

### 2. RH Dashboard

**Sections:**
- 🎯 **Pending Actions Panel**
  - Demandes de congé en attente (badge count)
  - Profils à valider (badge count)
  - Anomalies à traiter (badge count)

- 📊 **Analytics Overview**
  - Total employees
  - Absenteeism rate
  - Leave usage %
  - Anomaly trends

- 📋 **Quick Access Tables**
  - Pending leave requests (with approve/reject)
  - Recent pointage anomalies
  - New employee profiles

- 🔍 **Search & Filters**
  - Search employees
  - Filter by department, status
  - Date range filters

### 3. SUPER_ADMIN Dashboard

**Sections:**
- 🎛️ **System Health**
  - Active users
  - Failed logins
  - Suspicious activities
  - System uptime

- 📊 **Advanced Analytics**
  - User activity graphs
  - Leave trends by department
  - Attendance heatmap
  - Audit log summaries

- ⚙️ **Configuration**
  - Manage roles & permissions
  - System settings
  - Email templates
  - Holiday calendar

- 🔐 **Security Dashboard**
  - Device fingerprints
  - Failed verification attempts
  - Unusual login patterns

---

## 🎨 UX IMPROVEMENTS

### 1. Notification Center Design

```
┌─────────────────────────────────────────┐
│ 🔔 Notifications (3 non lues)           │
│ [Tout marquer comme lu] [Paramètres]    │
├─────────────────────────────────────────┤
│                                          │
│ ⚠️ [URGENT] Anomalie détectée           │
│    Pointage suspect - 23:45              │
│    Il y a 2h                        [❌] │
│                                          │
│ ✅ Demande de congé approuvée           │
│    5 jours - Du 01/02 au 05/02          │
│    Il y a 3h                        [❌] │
│                                          │
│ 📋 Nouvelle demande de congé            │
│    user user - 3 jours (MALADIE)        │
│    Il y a 5h        [✓ Approuver] [✗]   │
│                                          │
│ [Voir toutes les notifications]         │
└─────────────────────────────────────────┘
```

### 2. Photo Capture UI

```
┌─────────────────────────────────────────┐
│        📸 Pointage avec Photo            │
├─────────────────────────────────────────┤
│                                          │
│     ┌──────────────────────┐            │
│     │                       │            │
│     │   [Camera Preview]    │            │
│     │                       │            │
│     │   Centrez votre       │            │
│     │   visage dans le      │            │
│     │   cadre               │            │
│     │                       │            │
│     └──────────────────────┘            │
│                                          │
│ ✓ Photo claire                           │
│ ✓ Bon éclairage                          │
│ ✓ Visage entier visible                 │
│                                          │
│ [📷 Capturer] [🔄 Reprendre]            │
│                                          │
│ 📍 Localisation: Tunis, Tunisia          │
│ ⏰ 08:45 - Lundi 26 Janvier 2026         │
└─────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Immediate)
- [ ] Fix leave request notification creation for RH
- [ ] Create /api/conges/all endpoint for RH to see all leaves
- [ ] Add proper role checks to all endpoints
- [ ] Implement audit logging on key actions
- [ ] Add RH decision tracking

### Phase 2: Attendance System (Week 1)
- [ ] Implement photo capture in pointage
- [ ] Add device fingerprint detection
- [ ] Create anomaly detection rules
- [ ] Build anomaly review UI for RH
- [ ] Add face verification (optional)

### Phase 3: Notification System (Week 2)
- [ ] Refactor notification service
- [ ] Implement SSE or WebSocket for real-time
- [ ] Create professional notification center UI
- [ ] Add notification preferences
- [ ] Implement cross-session sync

### Phase 4: Dashboards (Week 3)
- [ ] Redesign USER dashboard with Material Design
- [ ] Create RH dashboard with pending actions
- [ ] Build SUPER_ADMIN dashboard with analytics
- [ ] Add charts and visualizations
- [ ] Implement filters and search

### Phase 5: Polish (Week 4)
- [ ] Complete audit log coverage
- [ ] Add comprehensive role/permission checks
- [ ] Implement RHDecision tracking
- [ ] Add email notifications
- [ ] Performance optimization

---

## 📊 API ROUTE STRUCTURE

```
/api
├── /auth
│   ├── [...nextauth]
│   └── /register
├── /conges
│   ├── GET     (user's own leaves)
│   ├── POST    (submit new leave)
│   ├── /all    GET (RH: all leaves)
│   └── /[id]   PATCH (RH: approve/reject)
├── /pointage
│   ├── POST    (check-in/out with photo)
│   ├── GET     (user's own pointages)
│   └── /all    GET (RH: all pointages)
├── /notifications
│   ├── GET     (user's notifications)
│   ├── /[id]   PATCH (mark as read)
│   ├── /[id]   DELETE (delete notification)
│   └── /stream GET (SSE for real-time)
├── /employees
│   ├── GET     (RH: all employees)
│   ├── /pending GET (RH: pending profiles)
│   └── /[id]   PATCH (RH: approve/reject)
├── /anomalies
│   ├── GET     (RH: all anomalies)
│   └── /[id]   PATCH (RH: review/resolve)
└── /audit
    └── GET     (Admin: audit logs)
```

---

## 🔐 SECURITY BEST PRACTICES

1. **Always verify session and role** before any database operation
2. **Never trust frontend data** - validate everything server-side
3. **Use transactions** for operations that affect multiple tables
4. **Hash sensitive data** (passwords with bcrypt, device fingerprints)
5. **Rate limit** critical endpoints (login, pointage)
6. **Sanitize inputs** to prevent SQL injection
7. **Log all security events** in audit_logs
8. **Implement CSRF protection** (NextAuth handles this)
9. **Use HTTPS only** in production
10. **Validate file uploads** (photos, documents)

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Test current fixes:**
   - Login as RH user
   - Visit http://localhost:3000/rh/conges
   - Verify you see all leave requests
   - Try approving/rejecting one
   - Check if user receives notification

2. **Implement missing pieces:**
   - RH decision logging
   - Audit log insertion
   - Photo capture UI
   - Anomaly detection rules

3. **Deploy real-time notifications:**
   - Choose SSE or WebSocket
   - Implement streaming endpoint
   - Update frontend to listen

Would you like me to implement any specific part of this architecture first?
