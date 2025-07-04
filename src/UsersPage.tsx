import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './components/ui/table';
import { Trash2, Loader2 } from 'lucide-react';
import DeleteConfirmDialog from './atoms/DeleteConfirmDialog';

// User profile type based on provided schema
export type UserProfile = {
  id: string;
  updated_at?: string | null;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false });
    if (error) {
      toast.error('Failed to fetch users');
    } else {
      setUsers((data as UserProfile[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users by name
  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  // Delete user
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('profiles').delete().eq('id', deleteId);
    if (error) {
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('User deleted');
      fetchUsers();
    }
    setDeleteLoading(false);
    setDeleteId(null);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="px-4 mx-auto">
      <Toaster />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
      </div>
      <div className="overflow-x-auto rounded shadow border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                  <Loader2 className="mx-auto animate-spin w-6 h-6" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-400">No users found.</TableCell>
              </TableRow>
            ) : filteredUsers.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || user.email || 'Profile'}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                      {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                </TableCell>
                <TableCell>{user.name || <span className="text-gray-400">—</span>}</TableCell>
                <TableCell>{user.email || <span className="text-gray-400">—</span>}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="icon"
                    disabled={deleteLoading && deleteId === user.id}
                    onClick={() => {
                      setDeleteId(user.id);
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={open => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
      />
    </div>
  );
};

export default UsersPage; 