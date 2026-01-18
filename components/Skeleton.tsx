'use client';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse'
}: SkeletonProps) {
    const baseStyle = 'bg-[#1F1F1F]';

    const variantStyles = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    };

    const animationStyles = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: '',
    };

    const style: React.CSSProperties = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`${baseStyle} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
            style={style}
        />
    );
}

// Pre-built skeleton patterns
export function EventCardSkeleton() {
    return (
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl overflow-hidden">
            <Skeleton className="h-48 w-full" variant="rectangular" />
            <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                </div>
            </div>
        </div>
    );
}

export function TicketCardSkeleton() {
    return (
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16" variant="circular" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-32 w-full" />
        </div>
    );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

export function StatCardSkeleton() {
    return (
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5">
            <Skeleton className="h-3 w-1/3 mb-3" />
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-[#141414] rounded-xl">
                    <Skeleton className="w-10 h-10" variant="circular" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
}

export default Skeleton;
