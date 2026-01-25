import { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp, User } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface Review {
    id: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

interface EventReviewsProps {
    eventId: string;
}

export default function EventReviews({ eventId }: EventReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        fetchReviews();
    }, [eventId]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reviews?eventId=${eventId}`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data);
            }
        } catch (error) {
            console.error('Failed to fetch reviews', error);
            showToast('Failed to load reviews', 'error');
        } finally {
            setLoading(false);
        }
    };

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    const getStarColor = (rating: number) => {
        if (rating >= 4) return 'text-green-500';
        if (rating >= 3) return 'text-yellow-500';
        return 'text-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <h3 className="text-[#737373] text-sm font-medium mb-2">Average Rating</h3>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold text-white">{averageRating}</span>
                        <span className="text-xl text-[#737373] mb-1">/ 5.0</span>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-5 h-5 ${star <= parseFloat(averageRating) ? 'text-yellow-500 fill-yellow-500' : 'text-[#333]'}`}
                            />
                        ))}
                    </div>
                    <p className="text-[#737373] text-sm mt-4">{reviews.length} total reviews</p>
                </div>

                {/* Rating Distribution (Placeholder for now, could be real) */}
                <div className="md:col-span-2 bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                    <h3 className="text-white font-medium mb-4">Rating Breakdown</h3>
                    <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((rating) => {
                            const count = reviews.filter(r => r.rating === rating).length;
                            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                            return (
                                <div key={rating} className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 w-12">
                                        <span className="text-sm text-white font-medium">{rating}</span>
                                        <Star className="w-3 h-3 text-[#737373]" />
                                    </div>
                                    <div className="flex-1 h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-[#737373] w-12 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#E11D2E]" />
                    Recent Feedback
                </h3>

                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-[#141414] border border-[#1F1F1F] rounded-2xl">
                        <div className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-6 h-6 text-[#333]" />
                        </div>
                        <p className="text-[#737373]">No reviews yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5 hover:border-[#2A2A2A] transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#2A2A2A]">
                                            <User className="w-5 h-5 text-[#737373]" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium text-sm">{review.userName || 'Anonymous'}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-[#333]'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] text-[#555]">
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[#B3B3B3] text-sm leading-relaxed pl-[52px]">
                                    "{review.comment}"
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
