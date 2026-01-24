
'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
    className?: string;
    placeholder?: string;
}

export default function ImageUpload({ value, onChange, label, className = "", placeholder = "Upload Image" }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            onChange(data.url);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-zinc-400 mb-2">{label}</label>}

            <div className="flex items-start gap-4">
                {/* Preview Area */}
                <div className="w-24 h-24 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 overflow-hidden shrink-0 relative group">
                    {value ? (
                        <>
                            <img src={value} alt="Preview" className="w-full h-full object-contain" />
                            <button
                                onClick={() => onChange('')}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </>
                    ) : (
                        <ImageIcon className="w-8 h-8 text-zinc-600" />
                    )}
                </div>

                {/* Upload Control */}
                <div className="flex-1">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600 rounded-xl text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                {value ? 'Change Image' : placeholder}
                            </>
                        )}
                    </button>

                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                    <p className="text-xs text-zinc-500 mt-2">
                        Max 5MB. Supports JPG, PNG, WEBP.
                    </p>
                </div>
            </div>

            {/* Manual URL Input Fallback */}
            <div className="mt-3">
                <div className="relative">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="w-full pl-3 pr-8 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-zinc-700"
                    />
                    {value && (
                        <button
                            onClick={() => onChange('')}
                            className="absolute right-2 top-1.5 text-zinc-500 hover:text-zinc-300"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
