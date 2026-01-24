'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, UserCheck, Shield, Check } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { ROLE_PERMISSIONS } from '@/lib/store';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'ORGANIZER' | 'SCANNER' | 'USER';
    assignedEventIds: string[];
    createdAt: string;
}

interface Event {
    id: string;
    name: string;
}

export default function UserManagement({ events }: { events: Event[] }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'SCANNER',
        assignedEventIds: [] as string[],
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/clerk-users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/clerk-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                showToast('User created successfully', 'success');
                setShowModal(false);
                fetchUsers();
                setFormData({ name: '', email: '', password: '', role: 'SCANNER', assignedEventIds: [] });
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to create user', 'error');
            }
        } catch (error) {
            showToast('Error creating user', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/admin/clerk-users?userId=${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('User deleted', 'success');
                setUsers(users.filter(u => u.id !== id));
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to delete user', 'error');
            }
        } catch (error) {
            showToast('Error deleting user', 'error');
        }
    };

    const toggleEventSelection = (eventId: string) => {
        const current = formData.assignedEventIds;
        if (current.includes(eventId)) {
            setFormData({ ...formData, assignedEventIds: current.filter(id => id !== eventId) });
        } else {
            setFormData({ ...formData, assignedEventIds: [...current, eventId] });
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN': return <span className="bg-red-900/30 text-red-400 text-xs px-2 py-1 rounded border border-red-900/50">Admin</span>;
            case 'ORGANIZER':
            case 'ORGANISER': return <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-1 rounded border border-purple-900/50">Organizer</span>;
            case 'SCANNER': return <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded border border-green-900/50">Scanner</span>;
            default: return <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded">User</span>;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* User Management Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-blue-500" />
                        User Management
                    </h2>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-900/20 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" /> Add User
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-zinc-500">Loading users...</div>
                ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-zinc-400 font-medium text-sm whitespace-nowrap">User</th>
                                        <th className="text-left py-4 px-6 text-zinc-400 font-medium text-sm whitespace-nowrap">Role</th>
                                        <th className="text-left py-4 px-6 text-zinc-400 font-medium text-sm whitespace-nowrap">Assigned Events</th>
                                        <th className="text-right py-4 px-6 text-zinc-400 font-medium text-sm whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold border border-zinc-700 shrink-0">
                                                        {user.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium truncate">{user.name}</p>
                                                        <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                {getRoleBadge(user.role)}
                                            </td>
                                            <td className="py-4 px-6">
                                                {user.assignedEventIds.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.assignedEventIds.map(eid => {
                                                            const evt = events.find(e => e.id === eid);
                                                            return evt ? (
                                                                <span key={eid} className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm whitespace-nowrap">
                                                                    {evt.name.substring(0, 15)}...
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 text-xs italic">All Events (Admin)</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <button onClick={() => handleDelete(user.id)} className="text-zinc-500 hover:text-red-500 transition-colors p-2">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>



            {/* Modal - Standardized Style */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Add New User</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Role</label>
                                <select
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="SCANNER">Scanner (Check-in only)</option>
                                    <option value="ORGANIZER">Organizer (Manage specific events)</option>
                                    <option value="ADMIN">Admin (Full Access)</option>
                                </select>
                            </div>

                            {formData.role !== 'ADMIN' && (
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Assign Events</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                        {events.map(event => (
                                            <label key={event.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-zinc-900 rounded-lg">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${formData.assignedEventIds.includes(event.id) ? 'bg-blue-600 border-blue-600' : 'border-zinc-700'}`}>
                                                    {formData.assignedEventIds.includes(event.id) && <UserCheck className="w-3 h-3 text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={formData.assignedEventIds.includes(event.id)}
                                                    onChange={() => toggleEventSelection(event.id)}
                                                />
                                                <span className="text-zinc-300 text-sm truncate">{event.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 border border-zinc-700">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
