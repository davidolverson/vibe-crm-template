/**
 * Single source of truth for RBAC permission matrix.
 * Both prisma/seed.ts and src/lib/tenant-provision.ts import from here.
 *
 * Convention: resource names are singular, actions are granular CRUD.
 */

export type Scope = 'all' | 'assigned';

export interface PermissionDef {
  resource: string;
  action: string;
  scope: Scope;
}

export interface RoleDef {
  name: string;
  permissions: PermissionDef[];
}

function perms(
  defaultScope: Scope,
  defs: Array<{ resource: string; actions: Array<string | [string, Scope]> }>
): PermissionDef[] {
  const result: PermissionDef[] = [];
  for (const { resource, actions } of defs) {
    for (const entry of actions) {
      if (Array.isArray(entry)) {
        result.push({ resource, action: entry[0], scope: entry[1] });
      } else {
        result.push({ resource, action: entry, scope: defaultScope });
      }
    }
  }
  return result;
}

export const ROLE_DEFINITIONS: RoleDef[] = [
  {
    name: 'Owner',
    permissions: perms('all', [
      { resource: 'dashboard',  actions: ['view'] },
      { resource: 'contacts',   actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'deals',      actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'tasks',      actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'activities', actions: ['view', 'create'] },
      { resource: 'forms',      actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'pipeline',   actions: ['view', 'edit'] },
      { resource: 'sequences',    actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'automations',  actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'sites',        actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'settings',   actions: ['view', 'edit'] },
      { resource: 'reports',    actions: ['view'] },
    ]),
  },
  {
    name: 'Admin',
    permissions: perms('all', [
      { resource: 'dashboard',  actions: ['view'] },
      { resource: 'contacts',   actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'deals',      actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'tasks',      actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'activities', actions: ['view', 'create'] },
      { resource: 'forms',      actions: ['view', 'create', 'edit'] },
      { resource: 'pipeline',   actions: ['view', 'edit'] },
      { resource: 'sequences',    actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'automations',  actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'sites',        actions: ['view', 'create', 'edit'] },
      { resource: 'settings',   actions: ['view'] },
      { resource: 'reports',    actions: ['view'] },
    ]),
  },
  {
    name: 'Producer',
    permissions: perms('all', [
      { resource: 'dashboard',  actions: ['view'] },
      { resource: 'contacts',   actions: [['view', 'assigned'], 'create', ['edit', 'assigned']] },
      { resource: 'deals',      actions: [['view', 'assigned'], 'create', ['edit', 'assigned']] },
      { resource: 'tasks',      actions: [['view', 'assigned'], 'create', ['edit', 'assigned']] },
      { resource: 'activities', actions: [['view', 'assigned'], 'create'] },
      { resource: 'pipeline',   actions: ['view'] },
      { resource: 'sequences',    actions: ['view'] },
      { resource: 'automations',  actions: ['view'] },
      { resource: 'sites',        actions: ['view'] },
    ]),
  },
  {
    name: 'Assistant',
    permissions: perms('all', [
      { resource: 'dashboard',  actions: ['view'] },
      { resource: 'contacts',   actions: ['view', 'create', 'edit'] },
      { resource: 'deals',      actions: ['view'] },
      { resource: 'tasks',      actions: ['view', 'create', 'edit'] },
      { resource: 'activities', actions: ['view', 'create'] },
      { resource: 'forms',      actions: ['view'] },
      { resource: 'pipeline',   actions: ['view'] },
      { resource: 'sequences',  actions: ['view'] },
      { resource: 'sites',      actions: ['view'] },
    ]),
  },
  {
    name: 'Transaction Coordinator',
    permissions: perms('all', [
      { resource: 'dashboard',  actions: ['view'] },
      { resource: 'contacts',   actions: [['view', 'assigned'], ['edit', 'assigned']] },
      { resource: 'deals',      actions: [['view', 'assigned'], ['edit', 'assigned']] },
      { resource: 'tasks',      actions: ['view', 'create', ['edit', 'assigned']] },
      { resource: 'activities', actions: [['view', 'assigned'], 'create'] },
      { resource: 'pipeline',   actions: ['view'] },
    ]),
  },
];

// All known resources and their possible actions (derived from ROLE_DEFINITIONS)
export const RESOURCE_ACTIONS = (() => {
  const map = new Map<string, Set<string>>();
  for (const role of ROLE_DEFINITIONS) {
    for (const p of role.permissions) {
      if (!map.has(p.resource)) map.set(p.resource, new Set());
      map.get(p.resource)!.add(p.action);
    }
  }
  return Array.from(map.entries()).map(([resource, actions]) => ({
    resource,
    actions: Array.from(actions).sort(),
  }));
})();

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead',          position: 0 },
  { name: 'Contacted',         position: 1 },
  { name: 'Qualifying',        position: 2 },
  { name: 'Showing / Meeting', position: 3 },
  { name: 'Offer Made',        position: 4 },
  { name: 'Under Contract',    position: 5 },
  { name: 'Closed Won',        position: 6 },
  { name: 'Closed Lost',       position: 7 },
] as const;

export const DEFAULT_FORM_FIELDS = [
  { label: 'First Name', type: 'text',     required: true,  position: 0 },
  { label: 'Last Name',  type: 'text',     required: true,  position: 1 },
  { label: 'Email',      type: 'email',    required: true,  position: 2 },
  { label: 'Phone',      type: 'phone',    required: false, position: 3 },
  { label: 'Message',    type: 'textarea', required: false, position: 4 },
] as const;
