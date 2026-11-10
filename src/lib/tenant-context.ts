import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContext {
  tenantId: string;
  userId: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error(
      'Tenant context not set. Wrap your code in withTenantContext().'
    );
  }
  return ctx;
}

export function withTenantContext<T>(
  tenantId: string,
  userId: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return tenantStorage.run({ tenantId, userId }, fn);
}
