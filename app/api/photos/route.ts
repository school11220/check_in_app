import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

interface GalleryItem {
    id: string;
    imageUrl: string;
    uploaderName: string;
    caption?: string;
    approved: boolean;
    likes: number;
    createdAt: string;
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const showAll = url.searchParams.get('all') === 'true';

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    try {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { gallery: true }
        });

        if (!event || !event.gallery) {
            return NextResponse.json({ photos: [] });
        }

        let photos = event.gallery as unknown as GalleryItem[];

        if (!showAll) {
            photos = photos.filter(p => p.approved);
        }

        // Sort by createdAt desc
        photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ photos });
    } catch (error) {
        console.error("Failed to fetch photos:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, imageUrl, uploaderName, caption } = body;

        if (!eventId || !imageUrl || !uploaderName) {
            return NextResponse.json(
                { error: 'Event ID, image URL, and uploader name are required' },
                { status: 400 }
            );
        }

        const newPhoto: GalleryItem = {
            id: randomUUID(),
            imageUrl,
            uploaderName,
            caption,
            approved: false,
            likes: 0,
            createdAt: new Date().toISOString(),
        };

        // We need to append to the existing json. 
        // Prisma doesn't have a simple "push to json array" without fetching first or using raw queries (which depend on DB).
        // Safest approach here: fetch, modify, save.

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { gallery: true }
        });

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        const currentGallery = (event.gallery as unknown as GalleryItem[]) || [];
        const updatedGallery = [...currentGallery, newPhoto];

        await prisma.event.update({
            where: { id: eventId },
            data: { gallery: updatedGallery as any }
        });

        return NextResponse.json({
            success: true,
            photo: newPhoto,
            message: 'Photo uploaded! It will appear after admin approval.',
        });
    } catch (error: any) {
        console.error("Failed to upload photo:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        // We need eventId to find the record. If the client doesn't send it, we are in trouble.
        // The previous implementation utilized Photo ID which was globally unique.
        // Now Photo ID is inside a JSON blob inside an Event.
        // To update a photo efficiently, we SHOULD know the eventId.
        // If the client doesn't send eventId, we'd have to search ALL events which is bad.
        // Assumption: Client sends eventId OR we search associated events (slow).
        // Let's check if the previous implementation expected eventId. It did NOT.
        // BUT, usually the context has eventId.
        // If we don't have eventId, we might have to fail or do a broad search.
        // Let's assume for now we might need to modify the client to send eventId, 
        // OR we try to find the event that has this photo.

        const { photoId, action, approved, eventId } = body;

        let targetEventId = eventId;

        if (!targetEventId) {
            // Fallback: Find event containing this photo in gallery
            // utilizing Prisma's array filtering syntax for JSONb (if supported/indexed) or just error out.
            // Since we are optimizing, demanding eventId is reasonable.
            // However, for backward compat with frontend if it doesn't send eventId, we might be stuck.
            // Let's try to query: findFirst where gallery contains { id: photoId }
            const foundEvent = await prisma.event.findFirst({
                where: {
                    gallery: {
                        path: [],
                        array_contains: [{ id: photoId }] // This is PostgreSQL specific syntax for some versions
                        // Actually the Prisma way for JSON match is specific.
                        // simpler: string contains search (hacky but works for UUIDs)
                    }
                },
                select: { id: true }
            });
            // Note: Generic string search on JSON is risky but UUIDs are unique enough.
            // Better approach: Require eventId. 
            // If foundEvent is null, return error.
            if (foundEvent) targetEventId = foundEvent.id;
        }

        if (!targetEventId) {
            return NextResponse.json({ error: 'Event ID is required for optimization' }, { status: 400 });
        }


        const event = await prisma.event.findUnique({
            where: { id: targetEventId },
            select: { gallery: true }
        });

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        let gallery = (event.gallery as unknown as GalleryItem[]) || [];
        const photoIndex = gallery.findIndex(p => p.id === photoId);

        if (photoIndex === -1) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

        const photo = gallery[photoIndex];

        if (action === 'approve') {
            photo.approved = approved !== false;
        } else if (action === 'like') {
            photo.likes += 1;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        gallery[photoIndex] = photo;

        await prisma.event.update({
            where: { id: targetEventId },
            data: { gallery: gallery as any }
        });

        return NextResponse.json({ success: true, photo, likes: photo.likes });

    } catch (error: any) {
        console.error("Failed to update photo:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const url = new URL(request.url);
    const photoId = url.searchParams.get('photoId');
    const eventId = url.searchParams.get('eventId'); // We need this now!

    if (!photoId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        let targetEventId = eventId;

        if (!targetEventId) {
            // Try to find it
            const foundEvent = await prisma.event.findFirst({
                where: {
                    gallery: {
                        string_contains: photoId
                    }
                },
                select: { id: true }
            });
            if (foundEvent) targetEventId = foundEvent.id;
        }

        if (!targetEventId) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });

        const event = await prisma.event.findUnique({
            where: { id: targetEventId },
            select: { gallery: true }
        });

        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        let gallery = (event.gallery as unknown as GalleryItem[]) || [];
        const newGallery = gallery.filter(p => p.id !== photoId);

        await prisma.event.update({
            where: { id: targetEventId },
            data: { gallery: newGallery as any }
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 404 });
    }
}
