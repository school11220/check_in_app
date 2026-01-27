import { useState } from 'react';
import { Event } from '@/lib/store';
import RegistrationFormBuilder from '@/components/admin/RegistrationFormBuilder';
import { X } from 'lucide-react';

interface EventModalProps {
    event: Event | null;
    onSave: (data: Partial<Event>) => void;
    onClose: () => void;
    isOrganizer?: boolean;
}

export default function EventModal({ event, onSave, onClose, isOrganizer = false }: EventModalProps) {
    const [tab, setTab] = useState<'basic' | 'details' | 'pricing' | 'registration' | 'schedule' | 'sponsors' | 'media'>('basic');
    const [formData, setFormData] = useState({
        name: event?.name || '',
        description: event?.description || '',
        date: event?.date || '',
        startTime: event?.startTime || '09:00',
        endTime: event?.endTime || '18:00',
        venue: event?.venue || '',
        address: event?.address || '',
        price: event ? event.price / 100 : 0,
        entryFee: event ? event.entryFee / 100 : 0,
        prizePool: event ? event.prizePool / 100 : 0,
        category: event?.category || 'other',
        imageUrl: event?.imageUrl || '',
        videoLink: event?.videoLink || '',
        organizerVideoLink: event?.organizerVideoLink || '',
        capacity: event?.capacity || 100,
        isFeatured: event?.isFeatured || false,
        organizer: event?.organizer || '',
        contactEmail: event?.contactEmail || '',
        contactPhone: event?.contactPhone || '',
        termsAndConditions: event?.termsAndConditions || '',
        registrationDeadline: event?.registrationDeadline || '',
        tags: event?.tags?.join(', ') || '',
        schedule: event?.schedule || [],
        // Early Bird Pricing
        earlyBirdEnabled: event?.earlyBirdEnabled || false,
        earlyBirdPrice: event ? (event.earlyBirdPrice || 0) / 100 : 0,
        earlyBirdDeadline: event?.earlyBirdDeadline || '',
        // Event Reminders
        sendReminders: event?.sendReminders ?? true,
        sponsors: event?.sponsors || [],
        registrationFields: event?.registrationFields || [],
    });

    const addScheduleItem = () => {
        setFormData({
            ...formData,
            schedule: [...formData.schedule, { id: `s${Date.now()}`, time: '', title: '', description: '', speaker: '' }]
        });
    };

    const updateScheduleItem = (index: number, field: string, value: string) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setFormData({ ...formData, schedule: newSchedule });
    };

    const removeScheduleItem = (index: number) => {
        setFormData({ ...formData, schedule: formData.schedule.filter((_, i) => i !== index) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            price: formData.price * 100,
            entryFee: formData.entryFee * 100,
            prizePool: formData.prizePool * 100,
            earlyBirdPrice: formData.earlyBirdPrice * 100,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">{event ? 'Edit Event' : 'Create Event'}</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex border-b border-zinc-800 px-6 overflow-x-auto">
                    {(['basic', 'details', 'pricing', 'registration', 'schedule', 'sponsors', 'media'] as const)
                        .filter(t => !isOrganizer || (t !== 'pricing' && t !== 'sponsors'))
                        .map(t => (
                            <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-white'}`}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {tab === 'basic' && (
                        <>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Event Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" rows={3} /></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Date *</label><input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Start Time</label><input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">End Time</label><input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as Event['category'] })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white">
                                    <option value="music">Music</option>
                                    <option value="tech">Tech</option>
                                    <option value="art">Art</option>
                                    <option value="sports">Sports</option>
                                    <option value="food">Food</option>
                                    <option value="gaming">Gaming</option>
                                    <option value="business">Business</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2"><input type="checkbox" id="featured" checked={formData.isFeatured} onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })} className="w-4 h-4 rounded" /><label htmlFor="featured" className="text-sm text-zinc-300">Featured Event</label></div>
                        </>
                    )}

                    {tab === 'details' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Venue *</label><input type="text" required value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Full Address</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            {!isOrganizer && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div><label className="block text-sm font-medium text-zinc-300 mb-1">Ticket Price (₹)</label><input type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                    <div><label className="block text-sm font-medium text-zinc-300 mb-1">Entry Fee (₹)</label><input type="number" min="0" value={formData.entryFee} onChange={(e) => setFormData({ ...formData, entryFee: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                    <div><label className="block text-sm font-medium text-zinc-300 mb-1">Prize Pool (₹)</label><input type="number" min="0" value={formData.prizePool} onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                {!isOrganizer && (
                                    <div><label className="block text-sm font-medium text-zinc-300 mb-1">Capacity</label><input type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                )}
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Registration Deadline</label><input type="date" value={formData.registrationDeadline} onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Tags (comma separated)</label><input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="gaming, esports, tournament" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Organizer</label><input type="text" value={formData.organizer} onChange={(e) => setFormData({ ...formData, organizer: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Contact Email</label><input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Terms & Conditions</label><textarea value={formData.termsAndConditions} onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" rows={2} /></div>
                        </>
                    )}

                    {tab === 'pricing' && (
                        <>
                            {/* Early Bird Pricing Section */}
                            <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Early Bird Pricing
                                        </h3>
                                        <p className="text-zinc-400 text-sm">Offer discounted tickets before a deadline</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.earlyBirdEnabled}
                                            onChange={(e) => setFormData({ ...formData, earlyBirdEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {formData.earlyBirdEnabled && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-700">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-1">Early Bird Price (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.earlyBirdPrice}
                                                onChange={(e) => setFormData({ ...formData, earlyBirdPrice: Number(e.target.value) })}
                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white"
                                                placeholder="Discounted price"
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {formData.price > 0 && formData.earlyBirdPrice > 0 && (
                                                    <>Save {Math.round(((formData.price - formData.earlyBirdPrice) / formData.price) * 100)}% off regular price</>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-1">Early Bird Deadline</label>
                                            <input
                                                type="date"
                                                value={formData.earlyBirdDeadline}
                                                onChange={(e) => setFormData({ ...formData, earlyBirdDeadline: e.target.value })}
                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white"
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">Price increases after this date</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Event Reminders Section */}
                            <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            Event Reminders
                                        </h3>
                                        <p className="text-zinc-400 text-sm">Send email reminders to ticket holders before the event</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.sendReminders}
                                            onChange={(e) => setFormData({ ...formData, sendReminders: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                {formData.sendReminders && (
                                    <div className="mt-4 pt-4 border-t border-zinc-700">
                                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Attendees will receive reminders:
                                        </p>
                                        <ul className="text-sm text-zinc-500 mt-2 space-y-1">
                                            <li>• 7 days before the event</li>
                                            <li>• 1 day before the event</li>
                                            <li>• 2 hours before the event</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Pricing Summary */}
                            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-5 border border-red-800/50">
                                <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Pricing Summary
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Regular Price</span>
                                        <span className="text-white font-semibold">₹{formData.price.toLocaleString()}</span>
                                    </div>
                                    {formData.earlyBirdEnabled && (
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Early Bird Price</span>
                                            <span className="text-green-400 font-semibold">₹{formData.earlyBirdPrice.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'registration' && (
                        <RegistrationFormBuilder
                            fields={formData.registrationFields || []}
                            onChange={(fields) => setFormData({ ...formData, registrationFields: fields })}
                        />
                    )}

                    {tab === 'schedule' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-white">Event Schedule</h3>
                                <button type="button" onClick={addScheduleItem} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">+ Add Item</button>
                            </div>
                            {formData.schedule.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No schedule items yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {formData.schedule.map((item, index) => (
                                        <div key={item.id} className="bg-zinc-800 rounded-xl p-4 space-y-2">
                                            <div className="flex gap-2">
                                                <input type="time" value={item.time} onChange={(e) => updateScheduleItem(index, 'time', e.target.value)} className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" />
                                                <input type="text" value={item.title} onChange={(e) => updateScheduleItem(index, 'title', e.target.value)} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Session title" />
                                                <button type="button" onClick={() => removeScheduleItem(index)} className="px-2 text-red-400 hover:text-red-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                            <input type="text" value={item.description} onChange={(e) => updateScheduleItem(index, 'description', e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Description" />
                                            <input type="text" value={item.speaker || ''} onChange={(e) => updateScheduleItem(index, 'speaker', e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Speaker (optional)" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'sponsors' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-white">Event Sponsors</h3>
                                <button
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        sponsors: [...formData.sponsors, { id: `sp-${Date.now()}`, name: '', logoUrl: '', tier: 'gold' }]
                                    })}
                                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                                >
                                    + Add Sponsor
                                </button>
                            </div>
                            {formData.sponsors.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No sponsors added yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {formData.sponsors.map((sponsor, index) => (
                                        <div key={sponsor.id} className="bg-zinc-800 rounded-xl p-4 space-y-3">
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-xs text-zinc-400">Name</label>
                                                    <input
                                                        type="text"
                                                        value={sponsor.name}
                                                        onChange={(e) => {
                                                            const newSponsors = [...formData.sponsors];
                                                            newSponsors[index] = { ...sponsor, name: e.target.value };
                                                            setFormData({ ...formData, sponsors: newSponsors });
                                                        }}
                                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                                                        placeholder="Sponsor Name"
                                                    />
                                                </div>
                                                <div className="w-32 space-y-2">
                                                    <label className="text-xs text-zinc-400">Tier</label>
                                                    <select
                                                        value={sponsor.tier}
                                                        onChange={(e) => {
                                                            const newSponsors = [...formData.sponsors];
                                                            newSponsors[index] = { ...sponsor, tier: e.target.value as 'gold' | 'silver' | 'bronze' };
                                                            setFormData({ ...formData, sponsors: newSponsors });
                                                        }}
                                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                                                    >
                                                        <option value="gold">Gold</option>
                                                        <option value="silver">Silver</option>
                                                        <option value="bronze">Bronze</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSponsors = formData.sponsors.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, sponsors: newSponsors });
                                                    }}
                                                    className="mt-6 text-zinc-500 hover:text-red-400"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-zinc-400">Logo URL</label>
                                                <input
                                                    type="text"
                                                    value={sponsor.logoUrl}
                                                    onChange={(e) => {
                                                        const newSponsors = [...formData.sponsors];
                                                        newSponsors[index] = { ...sponsor, logoUrl: e.target.value };
                                                        setFormData({ ...formData, sponsors: newSponsors });
                                                    }}
                                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                                                    placeholder="https://example.com/logo.png"
                                                />
                                            </div>
                                            {sponsor.logoUrl && (
                                                <div className="p-2 bg-white/5 rounded-lg inline-block">
                                                    <img src={sponsor.logoUrl} alt="Logo preview" className="h-8 object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'media' && (
                        <>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Event Image URL</label><input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="https://..." /></div>
                            {formData.imageUrl && (
                                <div className="mt-2">
                                    <p className="text-sm text-zinc-400 mb-2">Preview:</p>
                                    <img src={formData.imageUrl} alt="Preview" className="h-32 rounded-lg object-cover" />
                                </div>
                            )}
                            <div className="text-center text-zinc-500 text-sm py-2">— or upload an image —</div>
                            <div className="bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-red-500/50 transition-colors relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            if (file.size > 5 * 1024 * 1024) {
                                                alert('File size must be less than 5MB');
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const base64 = event.target?.result as string;
                                                setFormData({ ...formData, imageUrl: base64 });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-zinc-400 text-sm">Click or drag to upload image</p>
                                <p className="text-zinc-500 text-xs mt-1">PNG, JPG, WebP up to 5MB</p>
                            </div>

                            <div className="pt-4 border-t border-zinc-800 mt-4">
                                <h3 className="text-lg font-medium text-white mb-3">Integrations</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-1">Promo Video URL (YouTube)</label>
                                        <input type="url" value={formData.videoLink} onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="https://youtube.com/..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-1">Organizer Video URL</label>
                                        <input type="url" value={formData.organizerVideoLink} onChange={(e) => setFormData({ ...formData, organizerVideoLink: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="https://youtube.com/..." />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </form>

                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">{event ? 'Save Changes' : 'Create Event'}</button>
                </div>
            </div>
        </div >
    );
}
