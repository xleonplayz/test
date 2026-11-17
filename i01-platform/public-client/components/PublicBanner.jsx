'use client';export default function PublicBanner(){return <aside id='public-config'>Region: {process.env.NEXT_PUBLIC_REGION??'unset'} · Marker: {process.env.NEXT_PUBLIC_MARKER??'unset'}</aside>;}
