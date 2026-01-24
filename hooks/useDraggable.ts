
import { useRef, useState, useEffect } from 'react';

export function useDraggable() {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [hasMoved, setHasMoved] = useState(false);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!ref.current) return;
        setIsDragging(true);
        setHasMoved(false);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
        setHasMoved(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
        // We don't reset hasMoved here immediately to allow onClick to check it if necessary,
        // but for pointer-events logic, state update will trigger re-render.
        setTimeout(() => setHasMoved(false), 0);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();

        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 2;

        // Threshold check: ignore small movements (jitter)
        if (Math.abs(x - startX) > 5) {
            setHasMoved(true); // This state effectively represents "is actually dragging" for UI
            ref.current.scrollLeft = scrollLeft - walk;
        }
    };

    return {
        ref,
        events: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
        },
        isDragging: hasMoved // Expose hasMoved as the effective "dragging" state
    };
}
