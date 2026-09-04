'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
    return (
        <>
            <AuthenticateWithRedirectCallback />
            {/* Clerk may continue an OAuth callback into sign-up. Keep the
                Smart CAPTCHA mount available for that flow. */}
            <div id="clerk-captcha" data-cl-theme="light" data-cl-size="flexible" />
        </>
    );
}
