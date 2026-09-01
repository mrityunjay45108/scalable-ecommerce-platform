import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-4">
      <h1 className="text-6xl font-black text-primary">404</h1>
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <Button asChild className="rounded-xl font-bold">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
