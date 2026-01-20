'use client';

import { useState, useRef, useCallback } from 'react';
import RichTextEditor from './RichTextEditor';
import {
    CertificateType,
    CertificateTemplate,
    CertificateRecipient,
    DEFAULT_CERTIFICATE_TEMPLATES,
    generateCertificate,
    generateBulkCertificates,
    downloadPdf,
    downloadAsZip,
    readFileAsArrayBuffer,
    arrayBufferToBase64,
    base64ToArrayBuffer,
    createBlankCertificate,
} from '@/lib/certificate';

interface CertificateManagerProps {
    eventName?: string;
    eventDate?: string;
    showToast?: (message: string, type: 'success' | 'error') => void;
}

// SVG Icons for certificate types
const ICONS = {
    trophy: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
        </svg>
    ),
    medal: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C9.24 2 7 4.24 7 7c0 1.8.96 3.37 2.4 4.24L8 18l4-2 4 2-1.4-6.76A4.98 4.98 0 0017 7c0-2.76-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
        </svg>
    ),
    certificate: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    ),
    handshake: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.22 19.85c-.18.18-.5.21-.71 0a.504.504 0 010-.71l3.39-3.39-1.41-1.41-3.39 3.39c-.19.2-.51.19-.71 0a.513.513 0 010-.71l3.39-3.39-1.41-1.42-3.39 3.39c-.18.18-.5.21-.71 0a.504.504 0 010-.71l3.39-3.39L9.24 10.7l-3.39 3.39c-.18.18-.5.21-.71 0a.507.507 0 010-.71l3.82-3.83L12 12.59l1.18-1.18-7.35-7.35L2.89 7l4.06 4.06L3 15a1.99 1.99 0 000 2.83l2.12 2.12a1.99 1.99 0 002.83 0l3.39-3.39 1.41 1.41-3.39 3.39a2.008 2.008 0 00-.01 2.83 1.99 1.99 0 002.83 0l.71-.71c.18-.18.21-.5 0-.71l-.67-.67zM20.71 7l-2.83-2.83c-.78-.78-2.05-.78-2.83 0l-1.18 1.18 4.24 4.24 1.18-1.18c.78-.78.78-2.05 1.42-2.41z" />
        </svg>
    ),
};

const CERTIFICATE_TYPES: { type: CertificateType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'winner_1st', label: '1st Place', icon: ICONS.trophy, color: 'from-yellow-500 to-amber-600' },
    { type: 'winner_2nd', label: '2nd Place', icon: ICONS.medal, color: 'from-gray-400 to-gray-500' },
    { type: 'participant', label: 'Participants', icon: ICONS.certificate, color: 'from-blue-500 to-indigo-600' },
    { type: 'volunteer', label: 'Volunteers', icon: ICONS.handshake, color: 'from-green-500 to-emerald-600' },
];


export default function CertificateManager({ eventName = 'Event', eventDate, showToast }: CertificateManagerProps) {
    const [activeType, setActiveType] = useState<CertificateType>('participant');
    const [templates, setTemplates] = useState<Record<CertificateType, { base64: string; config: Omit<CertificateTemplate, 'id' | 'templateUrl'> } | null>>({
        winner_1st: null,
        winner_2nd: null,
        participant: null,
        volunteer: null,
    });
    const [names, setNames] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [emailMessages, setEmailMessages] = useState<Record<CertificateType, string>>({
        winner_1st: 'Congratulations on winning 1st place! Your hard work and dedication have truly paid off.',
        winner_2nd: 'Congratulations on winning 2nd place! This is a fantastic achievement.',
        participant: 'Thank you for your enthusiastic participation! We hope you had a great learning experience.',
        volunteer: 'Thank you for your selfless volunteering! Your support made this event possible.',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentTemplate = templates[activeType];
    const currentConfig = currentTemplate?.config || DEFAULT_CERTIFICATE_TEMPLATES[activeType];

    // Handle template upload
    const handleTemplateUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.includes('pdf')) {
            showToast?.('Please upload a PDF file', 'error');
            return;
        }

        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const base64 = arrayBufferToBase64(arrayBuffer);

            setTemplates(prev => ({
                ...prev,
                [activeType]: {
                    base64,
                    config: DEFAULT_CERTIFICATE_TEMPLATES[activeType],
                },
            }));

            // Create preview
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            setPreviewUrl(URL.createObjectURL(blob));

            showToast?.(`${CERTIFICATE_TYPES.find(t => t.type === activeType)?.label} template uploaded!`, 'success');
        } catch (error) {
            console.error('Error uploading template:', error);
            showToast?.('Failed to upload template', 'error');
        }
    }, [activeType, showToast]);

    // Update template config
    const updateConfig = useCallback((updates: Partial<Omit<CertificateTemplate, 'id' | 'templateUrl'>>) => {
        setTemplates(prev => ({
            ...prev,
            [activeType]: prev[activeType] ? {
                ...prev[activeType]!,
                config: {
                    ...prev[activeType]!.config,
                    ...updates,
                },
            } : null,
        }));
    }, [activeType]);

    // Generate preview
    const generatePreview = useCallback(async () => {
        if (!currentTemplate) {
            showToast?.('Please upload a template first', 'error');
            return;
        }

        try {
            const templateBytes = base64ToArrayBuffer(currentTemplate.base64);
            const pdfBytes = await generateCertificate(
                templateBytes,
                { name: 'Sample Name', type: activeType, eventName, eventDate },
                currentConfig
            );

            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (error) {
            console.error('Error generating preview:', error);
            showToast?.('Failed to generate preview', 'error');
        }
    }, [currentTemplate, activeType, eventName, eventDate, currentConfig, showToast]);

    // Generate and download single certificate
    const generateSingle = useCallback(async (name: string) => {
        if (!currentTemplate) {
            showToast?.('Please upload a template first', 'error');
            return;
        }

        try {
            setIsGenerating(true);
            const templateBytes = base64ToArrayBuffer(currentTemplate.base64);
            const pdfBytes = await generateCertificate(
                templateBytes,
                { name, type: activeType, eventName, eventDate },
                currentConfig
            );

            downloadPdf(pdfBytes, `${name} - ${eventName}.pdf`);
            showToast?.(`Certificate generated for ${name}!`, 'success');
        } catch (error) {
            console.error('Error generating certificate:', error);
            showToast?.('Failed to generate certificate', 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [currentTemplate, activeType, eventName, eventDate, currentConfig, showToast]);

    // Generate bulk certificates
    const generateBulk = useCallback(async () => {
        if (!currentTemplate) {
            showToast?.('Please upload a template first', 'error');
            return;
        }

        const nameList = names
            .split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (nameList.length === 0) {
            showToast?.('Please enter at least one name', 'error');
            return;
        }

        try {
            setIsGenerating(true);
            setProgress({ current: 0, total: nameList.length });

            const recipients: CertificateRecipient[] = nameList.map(name => ({
                name,
                type: activeType,
                eventName,
                eventDate,
            }));

            const templateBytes = base64ToArrayBuffer(currentTemplate.base64);
            const certificates = await generateBulkCertificates(
                templateBytes,
                recipients,
                currentConfig,
                (current, total) => setProgress({ current, total })
            );

            if (certificates.length === 1) {
                downloadPdf(certificates[0].pdf, certificates[0].name);
            } else {
                await downloadAsZip(certificates, `${eventName} - ${CERTIFICATE_TYPES.find(t => t.type === activeType)?.label} Certificates.zip`);
            }

            showToast?.(`${certificates.length} certificates generated!`, 'success');
        } catch (error) {
            console.error('Error generating certificates:', error);
            showToast?.('Failed to generate certificates', 'error');
        } finally {
            setIsGenerating(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [currentTemplate, names, activeType, eventName, eventDate, currentConfig, showToast]);

    // Generate and email certificates
    const generateAndEmail = useCallback(async () => {
        if (!currentTemplate) {
            showToast?.('Please upload a template first', 'error');
            return;
        }

        const lines = names.split('\n').filter(n => n.trim().length > 0);
        if (lines.length === 0) {
            showToast?.('Please enter at least one name', 'error');
            return;
        }

        // Parse lines to get name and email
        const recipients: { name: string; email?: string }[] = lines.map(line => {
            // Try "Name <email>" format
            const emailMatch = line.match(/(.*)<(.+@.+)>/);
            if (emailMatch) {
                return { name: emailMatch[1].trim(), email: emailMatch[2].trim() };
            }
            // Try "Name, email" format
            const parts = line.split(',');
            if (parts.length > 1) {
                const email = parts.pop()?.trim();
                if (email && email.includes('@')) {
                    return { name: parts.join(',').trim(), email };
                }
            }
            return { name: line.trim() };
        });

        const validRecipients = recipients.filter(r => r.email);
        if (validRecipients.length === 0) {
            showToast?.('No valid email addresses found. Use "Name <email>" or "Name, email" format.', 'error');
            return;
        }

        if (!confirm(`Ready to send ${validRecipients.length} emails? This might take a while.`)) {
            return;
        }

        try {
            setIsGenerating(true);
            setProgress({ current: 0, total: validRecipients.length });

            const templateBytes = base64ToArrayBuffer(currentTemplate.base64);

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < validRecipients.length; i++) {
                const recipient = validRecipients[i];
                setProgress({ current: i + 1, total: validRecipients.length });

                try {
                    // 1. Create Certificate Record in DB
                    // Generate PDF
                    const pdfBytes = await generateCertificate(
                        templateBytes,
                        {
                            name: recipient.name,
                            type: activeType,
                            eventName,
                            eventDate
                        },
                        currentConfig
                    );

                    // Convert to Base64
                    const base64 = arrayBufferToBase64(pdfBytes.buffer as ArrayBuffer);

                    // 4. Send Email
                    const response = await fetch('/api/email/send-certificate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: recipient.email,
                            recipientName: recipient.name,
                            eventName,
                            pdfBase64: base64,
                            customMessage: emailMessages[activeType],
                        }),
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        successCount++;
                    } else {
                        console.error(`Failed to send email to ${recipient.email}:`, data.error);
                        failCount++;
                        // Show specific error for the first failure
                        if (failCount === 1) {
                            showToast?.(`Error: ${data.error || 'Failed to send email'}`, 'error');
                        }
                    }
                } catch (err: any) {
                    console.error(`Error processing ${recipient.name}:`, err);
                    failCount++;
                }
            }

            if (successCount > 0) {
                showToast?.(`Sent ${successCount} emails successfully!${failCount > 0 ? ` (${failCount} failed)` : ''}`, 'success');
            } else {
                showToast?.('Failed to send any emails', 'error');
            }

        } catch (error) {
            console.error('Error in bulk email:', error);
            showToast?.('An error occurred during email sending', 'error');
        } finally {
            setIsGenerating(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [currentTemplate, names, activeType, eventName, eventDate, currentConfig, showToast, emailMessages]);

    // Create blank template
    const createBlank = useCallback(async () => {
        try {
            const pdfBytes = await createBlankCertificate();
            const base64 = arrayBufferToBase64(pdfBytes.buffer as ArrayBuffer);

            setTemplates(prev => ({
                ...prev,
                [activeType]: {
                    base64,
                    config: DEFAULT_CERTIFICATE_TEMPLATES[activeType],
                },
            }));

            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            setPreviewUrl(URL.createObjectURL(blob));

            showToast?.('Blank template created!', 'success');
        } catch (error) {
            console.error('Error creating blank template:', error);
            showToast?.('Failed to create blank template', 'error');
        }
    }, [activeType, showToast]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#E11D2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Certificate Generator
                    </h2>
                    <p className="text-[#737373] text-sm">Generate certificates for winners, participants, and volunteers</p>
                </div>
            </div>

            {/* Certificate Type Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CERTIFICATE_TYPES.map(cert => (
                    <button
                        key={cert.type}
                        onClick={() => {
                            setActiveType(cert.type);
                            if (templates[cert.type]) {
                                const blob = new Blob([base64ToArrayBuffer(templates[cert.type]!.base64)], { type: 'application/pdf' });
                                setPreviewUrl(URL.createObjectURL(blob));
                            } else {
                                setPreviewUrl(null);
                            }
                        }}
                        className={`p-4 rounded-xl border transition-all ${activeType === cert.type
                            ? `bg-gradient-to-br ${cert.color} border-transparent text-white shadow-lg`
                            : 'bg-[#141414] border-[#1F1F1F] text-[#B3B3B3] hover:border-[#2A2A2A]'
                            }`}
                    >
                        <div className="mb-2 flex justify-center">{cert.icon}</div>
                        <span className="font-medium">{cert.label}</span>
                        {templates[cert.type] && (
                            <span className="flex items-center justify-center gap-1 text-xs mt-1 opacity-75">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Template uploaded
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Template & Settings */}
                <div className="space-y-6">
                    {/* Template Upload */}
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5">
                        <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Template Upload
                        </h3>

                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf"
                            onChange={handleTemplateUpload}
                            className="hidden"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-3 px-4 border-2 border-dashed border-[#2A2A2A] rounded-xl text-[#B3B3B3] hover:border-[#E11D2E] hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload PDF Template
                            </button>
                            <button
                                onClick={createBlank}
                                className="px-4 py-3 bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl text-[#B3B3B3] hover:bg-[#2A2A2A] hover:text-white transition-all"
                                title="Create blank template"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        {currentTemplate && (
                            <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Template loaded for {CERTIFICATE_TYPES.find(t => t.type === activeType)?.label}
                            </p>
                        )}
                    </div>

                    {/* Email Message Editor */}
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5">
                        <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email Message
                        </h3>
                        <RichTextEditor
                            value={emailMessages[activeType]}
                            onChange={(value) => setEmailMessages(prev => ({ ...prev, [activeType]: value }))}
                            placeholder="Enter the body of the email here..."
                        />
                        <p className="text-xs text-[#737373] mt-2">
                            This message will be included in the email sent to recipients.
                        </p>
                    </div>

                    {/* Text Settings */}
                    {currentTemplate && (
                        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5">
                            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Text Settings
                            </h3>

                            <div className="space-y-4">
                                {/* Font Size */}
                                <div>
                                    <label className="block text-sm text-[#B3B3B3] mb-2">Font Size: {currentConfig.fontSize}px</label>
                                    <input
                                        type="range"
                                        min="24"
                                        max="72"
                                        value={currentConfig.fontSize}
                                        onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
                                        className="w-full accent-[#E11D2E]"
                                    />
                                </div>

                                {/* Position Y */}
                                <div>
                                    <label className="block text-sm text-[#B3B3B3] mb-2">Name Position Y: {currentConfig.namePositionY}%</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="90"
                                        value={currentConfig.namePositionY}
                                        onChange={(e) => updateConfig({ namePositionY: parseInt(e.target.value) })}
                                        className="w-full accent-[#E11D2E]"
                                    />
                                </div>

                                {/* Text Color */}
                                <div>
                                    <label className="block text-sm text-[#B3B3B3] mb-2">Name Color</label>
                                    <div className="flex gap-2">
                                        {[
                                            { r: 253, g: 181, b: 21, name: 'Gold' },
                                            { r: 192, g: 192, b: 192, name: 'Silver' },
                                            { r: 205, g: 127, b: 50, name: 'Bronze' },
                                            { r: 0, g: 0, b: 0, name: 'Black' },
                                            { r: 255, g: 255, b: 255, name: 'White' },
                                        ].map(color => (
                                            <button
                                                key={color.name}
                                                onClick={() => updateConfig({ textColor: { r: color.r, g: color.g, b: color.b } })}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${currentConfig.textColor.r === color.r && currentConfig.textColor.g === color.g
                                                    ? 'border-white scale-110'
                                                    : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Font Family */}
                                <div>
                                    <label className="block text-sm text-[#B3B3B3] mb-2">Font</label>
                                    <select
                                        value={currentConfig.fontFamily}
                                        onChange={(e) => updateConfig({ fontFamily: e.target.value as 'TimesRoman' | 'Helvetica' | 'Courier' })}
                                        className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white"
                                    >
                                        <option value="TimesRoman">Times Roman (Classic)</option>
                                        <option value="Helvetica">Helvetica (Modern)</option>
                                        <option value="Courier">Courier (Formal)</option>
                                    </select>
                                </div>

                                <button
                                    onClick={generatePreview}
                                    className="w-full py-2 bg-[#1F1F1F] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
                                >
                                    Update Preview
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Names Input */}
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5">
                        <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Recipients (one name per line)
                        </h3>

                        <textarea
                            value={names}
                            onChange={(e) => setNames(e.target.value)}
                            placeholder={`John Doe\nJane Smith, jane@example.com\nAlex Johnson <alex@example.com>`}
                            rows={8}
                            className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white placeholder:text-[#737373] focus:border-[#E11D2E]/50 focus:outline-none resize-none"
                        />

                        <p className="text-xs text-[#737373] mt-2">
                            {names.split('\n').filter(n => n.trim()).length} names entered
                        </p>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateBulk}
                        disabled={isGenerating || !currentTemplate || names.trim().length === 0}
                        className="w-full py-4 bg-gradient-to-r from-[#E11D2E] to-[#B91C1C] text-white font-medium rounded-xl hover:from-[#C41E3A] hover:to-[#991B1B] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Generating... {progress.current}/{progress.total}
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Generate & Download Certificates
                            </>
                        )}
                    </button>

                    {/* Email Button */}
                    <button
                        onClick={generateAndEmail}
                        disabled={isGenerating || !currentTemplate || names.trim().length === 0}
                        className="w-full py-4 bg-[#141414] border border-[#2A2A2A] text-white font-medium rounded-xl hover:bg-[#1A1A1A] hover:border-[#E11D2E] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Generate & Email to Recipients
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column - Preview */}
                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5 h-fit sticky top-4">
                    <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                    </h3>

                    {previewUrl ? (
                        <div className="aspect-[4/3] bg-[#0D0D0D] rounded-xl overflow-hidden">
                            <embed
                                src={previewUrl}
                                type="application/pdf"
                                className="w-full h-full"
                            />
                        </div>
                    ) : (
                        <div className="aspect-[4/3] bg-[#0D0D0D] rounded-xl flex items-center justify-center">
                            <div className="text-center text-[#737373]">
                                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm">Upload a template to preview</p>
                            </div>
                        </div>
                    )}

                    {currentTemplate && names.trim() && (
                        <div className="mt-4 p-3 bg-[#0D0D0D] rounded-lg">
                            <p className="text-sm text-[#B3B3B3]">
                                Ready to generate <span className="text-white font-medium">{names.split('\n').filter(n => n.trim()).length}</span> certificates for{' '}
                                <span className="text-white font-medium">{CERTIFICATE_TYPES.find(t => t.type === activeType)?.label}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
