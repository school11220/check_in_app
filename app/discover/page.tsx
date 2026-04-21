import { redirect } from 'next/navigation';

export default function DiscoverRedirect() {
    // Redirect /discover to the main landing page
    redirect('/');
}
