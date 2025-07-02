import { supabase } from '../supabase';
import type { Role, Permission, UserRole, AccessLevel } from '../types/roles';
import { v4 as uuidv4 } from 'uuid';

export class RoleManager {
  private static instance: RoleManager;
  private roleCache: Map<string, Role> = new Map();
  private userRoleCache: Map<string, UserRole[]> = new Map();

  private constructor() {}

  public static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager();
    }
    return RoleManager.instance;
  }

  public async assignRole(
    userId: string,
    roleId: string,
    communityId?: string,
    assignedBy?: string,
    expiresAt?: string
  ): Promise<void> {
    try {
      const userRole = {
        user_id: userId,
        role_id: roleId,
        community_id: communityId,
        assigned_by: assignedBy || userId,
        assigned_at: new Date().toISOString(),
        expires_at: expiresAt
      };

      const { error } = await supabase
        .from('user_roles')
        .insert(userRole);

      if (error) throw error;

      // Clear user role cache
      this.userRoleCache.delete(userId);
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }

  public async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      // Check cache first
      if (this.userRoleCache.has(userId)) {
        return this.userRoleCache.get(userId)!;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          roles (
            name,
            access_level,
            permissions
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Transform the data to match expected structure
      const transformedData = data.map(item => ({
        ...item,
        role: item.roles
      }));

      // Update cache
      this.userRoleCache.set(userId, transformedData);
      return transformedData;
    } catch (error) {
      console.error('Error getting user roles:', error);
      throw error;
    }
  }

  public async hasPermission(
    userId: string,
    permission: Permission,
    communityId?: string
  ): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      
      // First check global roles (where communityId is null)
      const hasGlobalPermission = userRoles.some(userRole => {
        if (userRole.community_id !== null) return false;
        
        const role = userRole.role;
        if (!role) return false;

        // Check if role has expired
        if (userRole.expires_at && new Date(userRole.expires_at) < new Date()) {
          return false;
        }

        // Platform Owner has all permissions
        if (role.name === 'Platform Owner') return true;

        // Check if role has the required permission
        return role.permissions.some(p => 
          (p.scope === 'global' || p.scope === permission.scope) &&
          (p.action === 'manage' || p.action === permission.action) &&
          (p.resource === '*' || p.resource === permission.resource)
        );
      });

      if (hasGlobalPermission) return true;

      // If no global permission and no communityId provided, return false
      if (!communityId) return false;

      // Check community-specific roles
      return userRoles.some(userRole => {
        if (userRole.community_id !== communityId) return false;
        
        const role = userRole.role;
        if (!role) return false;

        // Check if role has expired
        if (userRole.expires_at && new Date(userRole.expires_at) < new Date()) {
          return false;
        }

        // Check if role has the required permission
        return role.permissions.some(p => 
          p.scope === permission.scope &&
          (p.action === 'manage' || p.action === permission.action) &&
          (p.resource === '*' || p.resource === permission.resource)
        );
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      throw error;
    }
  }

  public async getRole(roleId: string): Promise<Role | null> {
    try {
      // Check cache first
      if (this.roleCache.has(roleId)) {
        return this.roleCache.get(roleId)!;
      }

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (error) throw error;

      // Update cache
      this.roleCache.set(roleId, data);
      return data;
    } catch (error) {
      console.error('Error getting role:', error);
      throw error;
    }
  }

  public async createRole(
    name: string,
    accessLevel: AccessLevel,
    permissions: Permission[]
  ): Promise<Role> {
    try {
      const role: Role = {
        id: uuidv4(),
        name,
        accessLevel,
        permissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('roles')
        .insert(role);

      if (error) throw error;

      // Update cache
      this.roleCache.set(role.id, role);
      return role;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  public clearCache(): void {
    this.roleCache.clear();
    this.userRoleCache.clear();
  }
}

export const roleManager = RoleManager.getInstance();