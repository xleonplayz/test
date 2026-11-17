import Link from 'next/link';export default async function Order({params}){const {id}=await params;return <main><h1>Auftrag {id}</h1><Link href='/'>Zur Warenwirtschaft</Link></main>;}
