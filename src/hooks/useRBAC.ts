import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { roleManager } from '../lib/rbac/RoleManager';
import type { Permission } from '../types/roles';

export function useRBAC(permission: Permission, communityId?: string) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        const result = await roleManager.hasPermission(user.id, permission, communityId);
        setHasPermission(result);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [user, permission, communityId]);

  return { hasPermission, loading };
}