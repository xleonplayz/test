<template><div><header><h1>Kontor · Nitro</h1></header><div ref="desk" /></div></template>
<script setup>
import {mount} from './ui.js';
import './style.css';
const desk=ref(null);let dispose;
onMounted(()=>{dispose=mount(desk.value)});onBeforeUnmount(()=>dispose?.());
</script>
