'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1F2B1F]">
      <div className="animate-spin w-8 h-8 border-4 border-[#8BAF4E] border-t-transparent rounded-full" />
    </div>
  );
}
