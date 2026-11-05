const AuditLog = require('../models/AuditLog');

async function recordAudit(actor, action, resource, resourceId, metadata) {
  await AuditLog.create({
    actor: actor?._id,
    action,
    resource,
    resourceId: resourceId ? String(resourceId) : undefined,
    metadata
  });
}

module.exports = recordAudit;
