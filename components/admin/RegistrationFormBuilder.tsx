'use client';

import { useState } from 'react';
import { RegistrationField } from '@/lib/store';
import { Trash2, Plus, GripVertical } from 'lucide-react';

interface RegistrationFormBuilderProps {
    fields: RegistrationField[];
    onChange: (fields: RegistrationField[]) => void;
}

export default function RegistrationFormBuilder({ fields, onChange }: RegistrationFormBuilderProps) {
    const handleAddField = (type: 'text' | 'select' | 'checkbox') => {
        const newField: RegistrationField = {
            id: crypto.randomUUID(),
            type,
            label: type === 'text' ? 'Full Name' : type === 'select' ? 'Select Option' : 'I agree to terms',
            required: false,
            options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
        };
        onChange([...fields, newField]);
    };

    const handleUpdateField = (id: string, updates: Partial<RegistrationField>) => {
        onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleDeleteField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    const handleOptionChange = (fieldId: string, optionIndex: number, value: string) => {
        const field = fields.find(f => f.id === fieldId);
        if (field && field.options) {
            const newOptions = [...field.options];
            newOptions[optionIndex] = value;
            handleUpdateField(fieldId, { options: newOptions });
        }
    };

    const handleAddOption = (fieldId: string) => {
        const field = fields.find(f => f.id === fieldId);
        if (field && field.options) {
            handleUpdateField(fieldId, { options: [...field.options, `Option ${field.options.length + 1}`] });
        }
    };

    const handleDeleteOption = (fieldId: string, optionIndex: number) => {
        const field = fields.find(f => f.id === fieldId);
        if (field && field.options && field.options.length > 1) { // Prevent empty options
            const newOptions = field.options.filter((_, i) => i !== optionIndex);
            handleUpdateField(fieldId, { options: newOptions });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => handleAddField('text')}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Text Input
                </button>
                <button
                    type="button"
                    onClick={() => handleAddField('select')}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Dropdown
                </button>
                <button
                    type="button"
                    onClick={() => handleAddField('checkbox')}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Checkbox
                </button>
            </div>

            <div className="space-y-4">
                {fields.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
                        No fields added. Click a button above to add questions to the registration form.
                    </div>
                ) : (
                    fields.map((field, index) => (
                        <div key={field.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl group hover:border-zinc-700 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="mt-2 text-zinc-600 cursor-move">
                                    <GripVertical className="w-5 h-5" />
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs text-zinc-500 font-medium mb-1 block">Question Label</label>
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none"
                                                placeholder="e.g. What is your T-shirt size?"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-xs text-zinc-500 font-medium mb-1 block">Type</label>
                                            <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 text-sm capitalize">
                                                {field.type}
                                            </div>
                                        </div>
                                    </div>

                                    {field.type === 'select' && field.options && (
                                        <div className="space-y-2 pl-4 border-l-2 border-zinc-800">
                                            <label className="text-xs text-zinc-500 font-medium block">Options</label>
                                            {field.options?.map((option, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(field.id, idx, e.target.value)}
                                                        className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:border-red-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteOption(field.id, idx)}
                                                        className="p-1.5 text-zinc-500 hover:text-red-400"
                                                        disabled={(field.options?.length || 0) <= 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => handleAddOption(field.id)}
                                                className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Option
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-500/50"
                                            />
                                            <span className="text-sm text-zinc-400">Required field</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDeleteField(field.id)}
                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
