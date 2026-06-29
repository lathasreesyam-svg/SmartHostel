/**
 * Central RBAC + ABAC Permission System
 *
 * RBAC  — Role-Based:      what actions a role CAN do
 * ABAC  — Attribute-Based: whether THIS actor can act on THAT resource
 *
 * Usage:
 *   RBAC middleware:  requirePermission('CREATE_REBATE')
 *   ABAC check:       abacCheck.canReviewRebate(actorId, rebate)
 */

export type Role = 'STUDENT' | 'COMMITTEE' | 'WARDEN' | 'ADMIN';

export type Permission =
  // Rebates
  | 'CREATE_REBATE'
  | 'VIEW_OWN_REBATES'
  | 'VIEW_ALL_REBATES'
  | 'REVIEW_REBATE'
  // Complaints
  | 'CREATE_COMPLAINT'
  | 'VIEW_OWN_COMPLAINTS'
  | 'VIEW_ALL_COMPLAINTS'
  | 'RESPOND_COMPLAINT'
  | 'UPDATE_COMPLAINT_STATUS'
  // Attendance
  | 'VIEW_OWN_ATTENDANCE'
  | 'VIEW_ALL_ATTENDANCE'
  | 'MARK_ATTENDANCE'
  // Menu
  | 'VIEW_MENU'
  | 'MANAGE_MENU'
  // Inventory
  | 'VIEW_INVENTORY'
  | 'MANAGE_INVENTORY'
  // Notifications
  | 'VIEW_OWN_NOTIFICATIONS'
  | 'SEND_NOTIFICATION'
  | 'BROADCAST_NOTIFICATION'
  // Workers
  | 'VIEW_WORKERS'
  | 'MANAGE_WORKERS'
  // Analytics
  | 'VIEW_ANALYTICS'
  // Admin
  | 'MANAGE_USERS'
  | 'MANAGE_BLOCKS'
  | 'INVITE_USER'
  // Feedback
  | 'SUBMIT_FEEDBACK'
  | 'VIEW_FEEDBACK';

// ── RBAC Matrix ─────────────────────────────────────────────────────────────
// Maps permission → roles that are allowed
const PERMISSION_MATRIX: Record<Permission, Role[]> = {
  // Rebates
  CREATE_REBATE:           ['STUDENT'],
  VIEW_OWN_REBATES:        ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'],
  VIEW_ALL_REBATES:        ['COMMITTEE', 'WARDEN', 'ADMIN'],
  REVIEW_REBATE:           ['COMMITTEE', 'WARDEN', 'ADMIN'],

  // Complaints
  CREATE_COMPLAINT:        ['STUDENT', 'COMMITTEE', 'WARDEN'],
  VIEW_OWN_COMPLAINTS:     ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'],
  VIEW_ALL_COMPLAINTS:     ['COMMITTEE', 'WARDEN', 'ADMIN'],
  RESPOND_COMPLAINT:       ['COMMITTEE', 'WARDEN', 'ADMIN'],
  UPDATE_COMPLAINT_STATUS: ['COMMITTEE', 'WARDEN', 'ADMIN'],

  // Attendance
  VIEW_OWN_ATTENDANCE:     ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'],
  VIEW_ALL_ATTENDANCE:     ['COMMITTEE', 'WARDEN', 'ADMIN'],
  MARK_ATTENDANCE:         ['COMMITTEE', 'WARDEN', 'ADMIN'],

  // Menu
  VIEW_MENU:               ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'],
  MANAGE_MENU:             ['COMMITTEE', 'WARDEN', 'ADMIN'],

  // Inventory
  VIEW_INVENTORY:          ['COMMITTEE', 'WARDEN', 'ADMIN'],
  MANAGE_INVENTORY:        ['COMMITTEE', 'WARDEN', 'ADMIN'],

  // Notifications
  VIEW_OWN_NOTIFICATIONS:  ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'],
  SEND_NOTIFICATION:       ['COMMITTEE', 'WARDEN', 'ADMIN'],
  BROADCAST_NOTIFICATION:  ['WARDEN', 'ADMIN'],

  // Workers
  VIEW_WORKERS:            ['COMMITTEE', 'WARDEN', 'ADMIN'],
  MANAGE_WORKERS:          ['WARDEN', 'ADMIN'],

  // Analytics
  VIEW_ANALYTICS:          ['COMMITTEE', 'WARDEN', 'ADMIN'],

  // Admin
  MANAGE_USERS:            ['ADMIN'],
  MANAGE_BLOCKS:           ['WARDEN', 'ADMIN'],
  INVITE_USER:             ['ADMIN'],

  // Feedback
  SUBMIT_FEEDBACK:         ['STUDENT', 'COMMITTEE'],
  VIEW_FEEDBACK:           ['COMMITTEE', 'WARDEN', 'ADMIN'],
};

/**
 * RBAC check — does this role have this permission?
 * Checks both current role AND primaryRole (for elevated committee members)
 */
export function hasPermission(role: string, primaryRole: string, permission: Permission): boolean {
  const allowed = PERMISSION_MATRIX[permission];
  return allowed.includes(role as Role) || allowed.includes(primaryRole as Role);
}

// ── ABAC Policies ────────────────────────────────────────────────────────────
// Attribute-based: checks specific resource attributes against actor attributes
// These are pure functions — no DB calls — called in service/controller layer

export const abacPolicies = {
  /**
   * A user CANNOT review their own rebate, even if they are COMMITTEE.
   * ACID + ABAC: enforced in service layer inside transaction.
   */
  canReviewRebate(actorId: string, rebateOwnerId: string): boolean {
    return actorId !== rebateOwnerId;
  },

  /**
   * A student can only view their own complaint.
   * COMMITTEE+ can view all complaints.
   */
  canViewComplaint(actorId: string, actorRole: string, complaintOwnerId: string): boolean {
    if (['COMMITTEE', 'WARDEN', 'ADMIN'].includes(actorRole)) return true;
    return actorId === complaintOwnerId;
  },

  /**
   * Only the complaint owner can delete their own complaint (if still OPEN).
   * Admin can delete any.
   */
  canDeleteComplaint(
    actorId: string,
    actorRole: string,
    complaintOwnerId: string,
    status: string
  ): boolean {
    if (actorRole === 'ADMIN') return true;
    return actorId === complaintOwnerId && status === 'OPEN';
  },

  /**
   * A committee member CANNOT mark themselves as present/absent.
   * Must be a different person than the student being marked.
   */
  canMarkStudentAttendance(markerId: string, studentId: string): boolean {
    return markerId !== studentId;
  },

  /**
   * A user can only update their own profile.
   */
  canUpdateProfile(actorId: string, profileOwnerId: string): boolean {
    return actorId === profileOwnerId;
  },

  /**
   * A user can only read/mark their own notifications.
   */
  canAccessNotification(actorId: string, notificationOwnerId: string): boolean {
    return actorId === notificationOwnerId;
  },

  /**
   * Only the rebate owner can cancel a PENDING rebate.
   */
  canCancelRebate(actorId: string, rebateOwnerId: string, status: string): boolean {
    return actorId === rebateOwnerId && status === 'PENDING';
  },
};
