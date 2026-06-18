'use client';

import { useState, useEffect } from 'react';
import {PartyPopper} from '@/components/icons';
interface CountdownTimerProps {
    targetDate: string | Date;
    eventName?: string;
    onExpire?: () => void;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
}

function calculateTimeLeft(targetDate: string | Date): TimeLeft {
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const difference = target - now;

    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false,
    };
}

export default function CountdownTimer({ targetDate, eventName, onExpire }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));

    useEffect(() => {
        const updateTime = () => {
            const nextTimeLeft = calculateTimeLeft(targetDate);
            setTimeLeft(nextTimeLeft);
            if (nextTimeLeft.expired) {
                onExpire?.();
            }
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onExpire]);

    if (timeLeft.expired) {
        return (
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700 rounded-2xl p-6 text-center">
                <div className="flex justify-center mb-2"><PartyPopper className="w-10 h-10 text-green-300" /></div>
                <h3 className="text-xl font-bold text-green-400">Event is Live!</h3>
                {eventName && <p className="text-green-300 mt-1">{eventName}</p>}
            </div>
        );
    }

    const timeUnits = [
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Minutes' },
        { value: timeLeft.seconds, label: 'Seconds' },
    ];

    return (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6">
            {eventName && (
                <h3 className="text-lg font-semibold text-white text-center mb-4">{eventName}</h3>
            )}
            <div className="flex justify-center gap-3">
                {timeUnits.map(({ value, label }) => (
                    <div key={label} className="text-center">
                        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 min-w-[70px]">
                            <span className="text-3xl font-bold text-white tabular-nums">
                                {value.toString().padStart(2, '0')}
                            </span>
                        </div>
                        <span className="text-xs text-zinc-500 mt-1 block">{label}</span>
                    </div>
                ))}
            </div>
            <p className="text-center text-zinc-400 text-sm mt-4">
                Until event starts
            </p>
        </div>
    );
}
