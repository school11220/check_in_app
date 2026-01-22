'use client';

import { useState } from 'react';
import { Survey } from '@/lib/store'; // Importing types
import { Star } from 'lucide-react';

interface SurveyFormProps {
    survey: Survey;
    siteName: string;
}

export default function SurveyForm({ survey, siteName }: SurveyFormProps) {
    const [answers, setAnswers] = useState<Record<string, string | number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (questionId: string, value: string | number) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const missing = survey.questions.filter(q => q.required && !answers[q.id]);
        if (missing.length > 0) {
            setError(`Please answer the following required questions: ${missing.map(q => q.question).join(', ')}`);
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/surveys/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    surveyId: survey.id,
                    eventId: survey.eventId,
                    answers: answers, // API expects this format, it will flatten/process it
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit survey');
            }

            setIsSubmitted(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Thank You!</h2>
                <p className="text-zinc-400 text-lg">Your feedback has been submitted successfully.</p>
                <button onClick={() => window.close()} className="mt-8 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
                    Close Window
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <header className="mb-12 text-center">
                <div className="inline-block px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-semibold tracking-wider mb-4 border border-red-500/20">
                    {siteName}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{survey.title}</h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto">{survey.description}</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">

                {survey.questions.map((q, index) => (
                    <div key={q.id} className="space-y-3 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                        <label className="block text-lg font-medium text-white">
                            {q.question}
                            {q.required && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        {/* Render Input Based on Type */}
                        {q.type === 'text' && (
                            <input
                                type="text"
                                value={answers[q.id] as string || ''}
                                onChange={(e) => handleInputChange(q.id, e.target.value)}
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                                placeholder="Your answer..."
                            />
                        )}

                        {q.type === 'longText' && (
                            <textarea
                                rows={4}
                                value={answers[q.id] as string || ''}
                                onChange={(e) => handleInputChange(q.id, e.target.value)}
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600 resize-none"
                                placeholder="Share your thoughts..."
                            />
                        )}

                        {q.type === 'rating' && (
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleInputChange(q.id, star)}
                                        className={`p-2 rounded-lg transition-all ${(answers[q.id] as number) >= star
                                                ? 'text-yellow-400 hover:text-yellow-300 scale-110'
                                                : 'text-zinc-700 hover:text-zinc-500'
                                            }`}
                                    >
                                        <Star className={`w-8 h-8 ${(answers[q.id] as number) >= star ? 'fill-current' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {q.type === 'multipleChoice' && (
                            <div className="grid grid-cols-1 gap-2">
                                {q.options?.map((option) => (
                                    <label
                                        key={option}
                                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${answers[q.id] === option
                                                ? 'bg-red-500/10 border-red-500/50'
                                                : 'bg-black/30 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={q.id}
                                            value={option}
                                            checked={answers[q.id] === option}
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                            className="w-4 h-4 text-red-600 bg-zinc-900 border-zinc-700 focus:ring-red-500 focus:ring-offset-0"
                                        />
                                        <span className={`ml-3 ${answers[q.id] === option ? 'text-white font-medium' : 'text-zinc-300'}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                        {error}
                    </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : 'Submit Feedback'}
                    </button>
                </div>
            </form>
        </div>
    );
}
