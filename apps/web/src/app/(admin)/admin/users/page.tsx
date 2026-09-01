'use client';

import React, { useEffect, useState } from 'react';
import { Search, Shield, ShieldCheck, UserX, UserCheck, CheckCircle2, XCircle, MoreVertical } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Role } from '@ecommerce/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'STAFF' | 'ADMIN'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Role change modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<Role>(Role.CUSTOMER);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get(`/users/admin/all?search=${encodeURIComponent(search)}`);
      setUsers(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleStatus = async (user: any) => {
    const action = user.isActive ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}'s account?`)) return;

    try {
      await apiClient.put(`/users/admin/${user.id}/toggle-status`);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsUpdatingRole(true);
    try {
      await apiClient.put(`/users/admin/${selectedUser.id}/role`, { role: newRole });
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRoleFilter === 'ALL') return true;
    return u.role === selectedRoleFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">User & Staff Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer accounts, assign role permissions, and control access
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full h-10 pl-9 pr-3 text-xs rounded-2xl border bg-card shadow-sm"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {(['ALL', 'CUSTOMER', 'STAFF', 'ADMIN'] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={selectedRoleFilter === r ? 'default' : 'outline'}
              onClick={() => setSelectedRoleFilter(r)}
              className="rounded-xl text-xs font-bold"
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Orders Placed</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {isLoading ? 'Loading users...' : 'No users found matching query.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={u.role === Role.ADMIN ? 'default' : u.role === Role.STAFF ? 'warning' : 'secondary'}
                        className="text-[10px]"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-semibold">{u._count?.orders || 0}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="p-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                        }}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Change Role
                      </Button>
                      <Button
                        size="sm"
                        variant={u.isActive ? 'destructive' : 'secondary'}
                        onClick={() => handleToggleStatus(u)}
                        className="rounded-xl text-xs font-semibold"
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Update Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Assign User Role</h3>
              <p className="text-xs text-muted-foreground">{selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})</p>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Access Level</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-semibold"
                >
                  <option value={Role.CUSTOMER}>CUSTOMER (Standard Shopper)</option>
                  <option value={Role.STAFF}>STAFF (Fulfillment & Inventory Operator)</option>
                  <option value={Role.ADMIN}>ADMIN (Full Console Access)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingRole}>
                  {isUpdatingRole ? 'Saving...' : 'Save Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
