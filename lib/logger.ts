import { prisma } from './prisma';

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'CHECKIN'
    | 'EXPORT'
    | 'SETTINGS_UPDATE';

export type AuditResource =
    | 'EVENT'
    | 'TICKET'
    | 'USER'
    | 'SETTINGS'
    | 'INTEGRATION'
    | 'AUTH';

interface LogAuditParams {
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    details?: Record<string, any>;
    userId: string;
    userName: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
}

export async function logAudit({
    action,
    resource,
    resourceId,
    details,
    userId,
    userName,
    userRole = 'ADMIN',
    ipAddress,
    userAgent
}: LogAuditParams) {
    try {
        await prisma.auditLog.create({
            data: {
                id: crypto.randomUUID(),
                action,
                resource,
                resourceId,
                details: details || {},
                userId,
                userName,
                userRole,
                ipAddress,
                userAgent
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw, we don't want to block the actual action if logging fails
    }
}
