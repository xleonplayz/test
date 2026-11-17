'use client';
import {useEffect,useRef} from 'react';
import {mount} from '../ui.js';
export default function Desk(){const ref=useRef(null);useEffect(()=>mount(ref.current),[]);return <div ref={ref} style={{minHeight:"100vh"}}/>;}
