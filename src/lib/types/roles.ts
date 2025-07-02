import { ROLE_IDS } from './roleIds';

export type AccessLevel = 'SUPREME_ADMIN' | 'ADMIN' | 'SECONDARY_ADMIN' | 'MEMBER' | 'USER';

export interface Role {
  id: string;
  name: string;
  accessLevel: AccessLevel;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'community' | 'content';
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  resource: string;
}

export const PLATFORM_OWNER: Role = {
  id: ROLE_IDS.PLATFORM_OWNER,
  name: 'Platform Owner',
  accessLevel: 'SUPREME_ADMIN',
  permissions: [
    {
      id: 'perm-all',
      name: 'all',
      description: 'Full system access',
      scope: 'global',
      action: 'manage',
      resource: '*'
    }
  ],
  createdAt: '',
  updatedAt: ''
};

export const PLATFORM_USER: Role = {
  id: ROLE_IDS.PLATFORM_USER,
  name: 'Platform User',
  accessLevel: 'USER',
  permissions: [
    {
      id: 'perm-view-public',
      name: 'view_public',
      description: 'View public content',
      scope: 'content',
      action: 'read',
      resource: 'public'
    },
    {
      id: 'perm-manage-profile',
      name: 'manage_profile',
      description: 'Manage own profile',
      scope: 'content',
      action: 'manage',
      resource: 'profile'
    }
  ],
  createdAt: '',
  updatedAt: ''
};

export const COMMUNITY_ADMIN: Role = {
  id: ROLE_IDS.COMMUNITY_ADMIN,
  name: 'Community Admin',
  accessLevel: 'ADMIN',
  permissions: [
    {
      id: 'perm-manage-community',
      name: 'manage_community',
      description: 'Manage community settings and content',
      scope: 'community',
      action: 'manage',
      resource: 'community'
    },
    {
      id: 'perm-manage-members',
      name: 'manage_members',
      description: 'Manage community members',
      scope: 'community',
      action: 'manage',
      resource: 'members'
    }
  ],
  createdAt: '',
  updatedAt: ''
};

export const COMMUNITY_CO_ADMIN: Role = {
  id: ROLE_IDS.COMMUNITY_CO_ADMIN,
  name: 'Community Co-Admin',
  accessLevel: 'SECONDARY_ADMIN',
  permissions: [
    {
      id: 'perm-manage-content',
      name: 'manage_content',
      description: 'Manage community content',
      scope: 'community',
      action: 'manage',
      resource: 'content'
    },
    {
      id: 'perm-moderate-members',
      name: 'moderate_members',
      description: 'Moderate community members',
      scope: 'community',
      action: 'update',
      resource: 'members'
    }
  ],
  createdAt: '',
  updatedAt: ''
};

export const COMMUNITY_MEMBER: Role = {
  id: ROLE_IDS.COMMUNITY_MEMBER,
  name: 'Community Member',
  accessLevel: 'MEMBER',
  permissions: [
    {
      id: 'perm-create-content',
      name: 'create_content',
      description: 'Create community content',
      scope: 'community',
      action: 'create',
      resource: 'content'
    },
    {
      id: 'perm-interact-content',
      name: 'interact_content',
      description: 'Interact with community content',
      scope: 'community',
      action: 'update',
      resource: 'content'
    }
  ],
  createdAt: '',
  updatedAt: ''
};