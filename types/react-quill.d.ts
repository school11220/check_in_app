declare module 'react-quill' {
    import React from 'react';
    export interface ReactQuillProps {
        theme?: string;
        value?: string;
        onChange?: (value: string) => void;
        modules?: any;
        formats?: string[];
        placeholder?: string;
        className?: string;
        children?: React.ReactNode;
    }
    const ReactQuill: React.ComponentType<ReactQuillProps>;
    export default ReactQuill;
}
