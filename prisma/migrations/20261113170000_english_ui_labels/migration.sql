-- Translate system UI labels without changing permission/menu/role codes.
UPDATE "menus" AS m
SET "name" = v."name"
FROM (VALUES
    ('accounts', 'Accounts'),
    ('games', 'Game Master'),
    ('vouchers', 'Vouchers'),
    ('promotions', 'Promotions'),
    ('transactions', 'Transactions'),
    ('reports', 'Reports'),
    ('pages', 'Static Pages'),
    ('settings', 'Settings'),
    ('audit', 'Audit Log'),
    ('webhooks', 'Webhooks')
) AS v("code", "name")
WHERE m."code" = v."code" AND m."is_system" = true;

UPDATE "permissions" AS p
SET "name" = v."name"
FROM (VALUES
    ('account:read', 'View accounts (admin)'),
    ('account:write', 'Manage accounts and photos'),
    ('credential:write', 'Write account credentials'),
    ('game:read', 'View game master data'),
    ('game:write', 'Manage game types and games'),
    ('voucher:read', 'View vouchers'),
    ('voucher:write', 'Manage vouchers'),
    ('promotion:read', 'View promotions'),
    ('promotion:write', 'Manage promotions'),
    ('theme:write', 'Manage themes'),
    ('page:read', 'View static pages'),
    ('page:write', 'Manage and publish static pages'),
    ('setting:read', 'View store settings'),
    ('setting:write', 'Change store settings'),
    ('transaction:read', 'View transactions'),
    ('transaction:sync', 'Sync payment status'),
    ('transaction:dispute', 'Mark or close disputes'),
    ('transaction:refund', 'Mark and complete refunds'),
    ('reveal:grant', 'Allow reveals outside the warranty period'),
    ('webhook:read', 'View webhook history'),
    ('webhook:retry', 'Retry failed webhooks'),
    ('complaint:decide', 'Decide complaints'),
    ('report:read', 'View sales reports'),
    ('audit:read', 'View audit log and audit reveals'),
    ('user:manage', 'Manage users: deactivate, force logout'),
    ('totp:reset', 'Reset user TOTP'),
    ('rbac:manage', 'Manage roles, menus, and permissions')
) AS v("code", "name")
WHERE p."code" = v."code" AND p."is_system" = true;

UPDATE "roles"
SET "name" = 'Buyer'
WHERE "code" = 'PEMBELI' AND "is_system" = true;
