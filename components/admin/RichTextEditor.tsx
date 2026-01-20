'use client';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    return (
        <div className="rich-text-editor [&_.ql-toolbar]:border-[#2A2A2A] [&_.ql-container]:border-[#2A2A2A] [&_.ql-editor]:text-white [&_.ql-toolbar]:bg-[#1A1A1A] [&_.ql-toolbar]:rounded-t-xl [&_.ql-container]:rounded-b-xl [&_.ql-container]:bg-[#0D0D0D] [&_.ql-picker]:text-white [&_.ql-stroke]:stroke-white [&_.ql-fill]:fill-white">
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                placeholder={placeholder}
                className="h-[200px] mb-12" // Add margin bottom for the toolbar
            />
        </div>
    );
}
