'use client';

import { usePathname } from 'next/navigation';

export default function HeaderLink() {
  const pathname = usePathname();
  const isAnkeworks = pathname?.startsWith('/ankeworks') || pathname?.startsWith('/workers');

  if (isAnkeworks) {
    return (
      <a 
        href="/" 
        className="hidden md:flex md:items-center md:bg-[#FFE3D6] md:pr-[5px] md:pl-[85px] md:border-gray-300 md:border-r md:border-l md:max-w-[200px] md:text-[0.8rem] md:text-left pc"
        style={{
          backgroundImage: 'url(/images/anke.webp)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          backgroundSize: '80px'
        }}
      >
        <div>
          アンケートで<br />
          人と繋がる! <i className="fa-arrow-circle-right fa"></i>
        </div>
      </a>
    );
  }

  return (
    <a 
      href="/ankeworks" 
      className="hidden md:flex md:items-center md:bg-[#FFE3D6] md:pr-[5px] md:pl-[85px] md:border-gray-300 md:border-r md:border-l md:max-w-[200px] md:text-[0.8rem] md:text-left pc"
      style={{
        backgroundImage: 'url(/images/ankeworks.webp)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        backgroundSize: '80px'
      }}
    >
      <div>
        アンケートで<br />
        副業!! <i className="fa-arrow-circle-right fa"></i>
      </div>
    </a>
  );
}
