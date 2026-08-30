
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import { getSession, hasRole, ORGANIZER_ROLES } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
        }

        const extension = path.extname(file.name).toLowerCase();
        if (!ALLOWED_MIME_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(extension)) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const signature = buffer.subarray(0, 12);
        const validSignature =
            (file.type === 'image/jpeg' && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) ||
            (file.type === 'image/png' && signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
            (file.type === 'image/gif' && signature.subarray(0, 6).toString() === 'GIF8') ||
            (file.type === 'image/webp' && signature.subarray(0, 4).toString() === 'RIFF' && signature.subarray(8, 12).toString() === 'WEBP');
        if (!validSignature) {
            return NextResponse.json({ error: 'File content does not match its image type' }, { status: 400 });
        }
        const safeBaseName = path.basename(file.name, extension)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 80) || 'upload';
        const filename = `${Date.now()}_${safeBaseName}${extension}`;

        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const blob = await put(filename, buffer, {
                access: 'public',
                contentType: file.type,
                addRandomSuffix: false,
            });
            return NextResponse.json({ success: true, url: blob.url, filename });
        }

        // Local development fallback. Configure Vercel Blob in production so
        // uploads survive across serverless instances and deployments.
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Return the public URL
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: filename
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
