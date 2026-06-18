'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from './Toaster';
import {Camera} from '@/components/icons';
interface Photo {
    id: string;
    eventId: string;
    imageUrl: string;
    uploaderName: string;
    caption?: string;
    approved: boolean;
    likes: number;
    createdAt: string;
}

interface PhotoWallProps {
    eventId: string;
    isAdmin?: boolean;
    attendeeName?: string;
}

export default function PhotoWall({ eventId, isAdmin = false, attendeeName = '' }: PhotoWallProps) {
    const { showToast } = useToast();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadData, setUploadData] = useState({ name: attendeeName, caption: '', imageUrl: '' });
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPhotos = async () => {
        try {
            const res = await fetch(`/api/photos?eventId=${eventId}${isAdmin ? '&all=true' : ''}`);
            const data = await res.json();
            setPhotos(data.photos || []);
        } catch (err) {
            console.error('Failed to fetch photos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
        // Poll for new photos every 10 seconds
        const interval = setInterval(fetchPhotos, 10000);
        return () => clearInterval(interval);
    }, [eventId, isAdmin]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Convert to base64 for demo (in production, upload to cloud storage)
            const reader = new FileReader();
            reader.onload = () => {
                setUploadData({ ...uploadData, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!uploadData.imageUrl || !uploadData.name) {
            showToast('Please select an image and enter your name', 'error');
            return;
        }

        setUploading(true);
        try {
            const res = await fetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    imageUrl: uploadData.imageUrl,
                    uploaderName: uploadData.name,
                    caption: uploadData.caption,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                showToast('Photo uploaded! Awaiting approval.', 'success');
                setShowUploadModal(false);
                setUploadData({ name: attendeeName, caption: '', imageUrl: '' });
                fetchPhotos();
            } else {
                showToast(data.error || 'Upload failed', 'error');
            }
        } catch (err) {
            showToast('Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleApprove = async (photoId: string, approved: boolean) => {
        try {
            await fetch('/api/photos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoId, action: 'approve', approved }),
            });
            fetchPhotos();
            showToast(approved ? 'Photo approved!' : 'Photo hidden', 'success');
        } catch (err) {
            showToast('Action failed', 'error');
        }
    };

    const handleLike = async (photoId: string) => {
        try {
            await fetch('/api/photos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoId, action: 'like' }),
            });
            fetchPhotos();
        } catch (err) {
            console.error('Like failed');
        }
    };

    const handleDelete = async (photoId: string) => {
        if (!confirm('Delete this photo?')) return;
        try {
            await fetch(`/api/photos?photoId=${photoId}`, { method: 'DELETE' });
            fetchPhotos();
            showToast('Photo deleted', 'success');
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Camera className="w-6 h-6 text-red-400" />
                        Photo Wall
                    </h2>
                    <p className="text-zinc-400 text-sm">{photos.length} photos shared</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Photo
                </button>
            </div>

            {/* Photo Grid */}
            {photos.length === 0 ? (
                <div className="text-center py-12 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                    <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-zinc-400">No photos yet. Be the first to share!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className={`relative group rounded-xl overflow-hidden bg-zinc-800 border ${!photo.approved ? 'border-yellow-600/50' : 'border-zinc-700'
                                }`}
                        >
                            <img
                                src={photo.imageUrl}
                                alt={photo.caption || 'Event photo'}
                                className="w-full aspect-square object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedPhoto(photo)}
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                <p className="text-white text-sm font-medium truncate">{photo.uploaderName}</p>
                                {photo.caption && <p className="text-zinc-300 text-xs truncate">{photo.caption}</p>}

                                <div className="flex items-center justify-between mt-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleLike(photo.id); }}
                                        className="flex items-center gap-1 text-pink-400 hover:text-pink-300"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                        <span className="text-xs">{photo.likes}</span>
                                    </button>

                                    {isAdmin && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleApprove(photo.id, !photo.approved); }}
                                                className={`p-1 rounded ${photo.approved ? 'text-green-400' : 'text-yellow-400'}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                                                className="p-1 rounded text-red-400"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!photo.approved && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                                    Pending
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4 inline-flex items-center gap-2">
                            <Camera className="w-5 h-5 text-red-400" />
                            Share a Photo
                        </h3>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Your name"
                                value={uploadData.name}
                                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                            />

                            <input
                                type="text"
                                placeholder="Caption (optional)"
                                value={uploadData.caption}
                                onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                            />

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-red-500 transition-colors"
                            >
                                {uploadData.imageUrl ? (
                                    <img src={uploadData.imageUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                                ) : (
                                    <>
                                        <svg className="w-12 h-12 mx-auto text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-zinc-400">Click to select photo</p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="flex-1 py-3 border border-zinc-700 text-white rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !uploadData.imageUrl}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="max-w-4xl max-h-[90vh] relative">
                        <img
                            src={selectedPhoto.imageUrl}
                            alt={selectedPhoto.caption || 'Photo'}
                            className="max-w-full max-h-[80vh] rounded-xl"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                            <p className="text-white font-medium">{selectedPhoto.uploaderName}</p>
                            {selectedPhoto.caption && <p className="text-zinc-300">{selectedPhoto.caption}</p>}
                        </div>
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
