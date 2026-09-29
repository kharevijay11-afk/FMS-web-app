export const ROLES = Object.freeze(['admin', 'staff', 'student']);
const operational = ['inquiry:create', 'inquiry:read', 'inquiry:update', 'student:summary:read:any', 'admin:dashboard:read'];
export const PERMISSIONS = Object.freeze({
  admin: Object.freeze([...operational, 'audit:read', 'system:admin']),
  staff: Object.freeze([...operational]),
  student: Object.freeze(['inquiry:create', 'student:summary:read:own'])
});
export const hasPermission = (principal, permission) => Boolean(principal && PERMISSIONS[principal.role]?.includes(permission));
export function assertValidRole(role) {
  if (!ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  return role;
}
