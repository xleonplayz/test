export function mount(root, { api = '/api', title = 'Kontor · Warenwirtschaft' } = {}) {
  let state, tab = 'products', query = '', category = '', page = 1, cart = new Map(), busy = false;
  const money = n => new Intl.NumberFormat('de-DE', {style:'currency',currency:'EUR'}).format(n / 100);
  const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!=null)n.textContent=text; if(cls)n.className=cls; return n; };
  const button = (text, action, cls) => { const b=el('button',text,cls); b.type='button'; b.onclick=action; return b; };
  const field = (form, name, text, type='text', value='') => { const l=el('label',text),i=el('input'); i.name=name;i.type=type;i.value=value;i.required=true;if(type==='number')i.min='0';l.append(i);form.append(l);return i; };
  root.replaceChildren(); const header=el('header'),brand=el('h1',title),nav=el('nav'),main=el('main'),notice=el('p','','notice');
  notice.setAttribute('role','status'); header.append(el('span','K /','mark'),brand); root.append(header,nav,notice,main);
  const tabs=[['products','Artikel'],['orders','Aufträge'],['customers','Kunden'],['reports','Auswertung'],['audit','Aktivität']];
  for(const [id,label] of tabs)nav.append(button(label,()=>{tab=id;render();}));
  async function request(path='', options={}) {
    const response=await fetch(api+path,options); const body=await response.json();
    if(!response.ok)throw new Error(body.error||`HTTP ${response.status}`); return body;
  }
  async function load(){try{state=await request(`/state?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&page=${page}`);render();}catch(e){notice.textContent=e.message;}}
  async function command(action){if(busy)return false;busy=true;notice.textContent='Wird gespeichert …';try{await request('/commands',{method:'POST',headers:{'Content-Type':'application/json','X-Sample':'1'},body:JSON.stringify({revision:state.revision,action})});notice.textContent='Gespeichert';await load();return true;}catch(e){notice.textContent=e.message;return false;}finally{busy=false;}}
  function modal(title, build, submit){
    const dialog=el('dialog'),form=el('form');form.append(el('h2',title));build(form);const actions=el('div','','actions');
    actions.append(button('Abbrechen',()=>dialog.close()));const save=el('button','Speichern','primary');save.type='submit';actions.append(save);form.append(actions);dialog.append(form);root.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove());form.onsubmit=async event=>{event.preventDefault();const saved=await submit(Object.fromEntries(new FormData(form)));if(saved!==false)dialog.close();};dialog.showModal();
  }
  function table(headings, rows){const wrap=el('div','','table-wrap'),table=el('table'),thead=el('thead'),tr=el('tr'),tbody=el('tbody');for(const h of headings)tr.append(el('th',h));thead.append(tr);table.append(thead,tbody);for(const row of rows){const tr=el('tr');for(const value of row){const td=el('td');td.append(value instanceof Node?value:document.createTextNode(String(value)));tr.append(td);}tbody.append(tr);}wrap.append(table);return wrap;}
  function render(){
    if(!state)return;main.replaceChildren();for(const [i,b] of [...nav.children].entries())b.setAttribute('aria-current',tabs[i][0]===tab?'page':'false');
    const stats=el('div','','stats');for(const [label,value] of [['Artikel',state.summary.products],['Aufträge',state.summary.orders],['Lagerwert',money(state.summary.stockValue)],['Umsatz',money(state.summary.revenue)]]){const card=el('article');card.append(el('span',label),el('strong',String(value)));stats.append(card);}main.append(stats);
    if(tab==='products'){
      const tools=el('div','','toolbar'),search=el('input'),select=el('select');search.type='search';search.placeholder='Artikel oder SKU suchen';search.value=query;search.setAttribute('aria-label','Artikel suchen');search.onchange=()=>{query=search.value;page=1;load();};
      for(const c of ['',...state.categories]){const o=el('option',c||'Alle Kategorien');o.value=c;select.append(o);}select.value=category;select.setAttribute('aria-label','Kategorie');select.onchange=()=>{category=select.value;page=1;load();};tools.append(search,select,button('Artikel anlegen',()=>modal('Neuer Artikel',f=>{field(f,'sku','Artikelnummer');field(f,'name','Bezeichnung');field(f,'category','Kategorie','text','Werkzeug');field(f,'price','Preis in Cent','number','199');field(f,'stock','Anfangsbestand','number','20');},v=>command({type:'product.create',...v,price:Number(v.price),stock:Number(v.stock)})),'primary'));main.append(tools);
      main.append(table(['Artikel','Kategorie','Verfügbar','Preis','Aktion'],state.products.map(p=>{const actions=el('div','','actions');actions.append(button('+ Auftrag',()=>{cart.set(p.id,{productId:p.id,name:p.name,quantity:(cart.get(p.id)?.quantity||0)+1});render();}),button('Wareneingang',()=>modal('Wareneingang · '+p.name,f=>field(f,'quantity','Menge','number','10'),v=>command({type:'stock.receive',id:p.id,quantity:Number(v.quantity)}))));return [p.sku+' · '+p.name,p.category,`${p.stock-p.reserved} / ${p.stock}`,money(p.price),actions];})));
      const pager=el('div','','actions');const prev=button('← Zurück',()=>{page--;load();});prev.disabled=page===1;const next=button('Weiter →',()=>{page++;load();});next.disabled=page*state.limit>=state.total;pager.append(prev,el('span',`Seite ${page} · ${state.total} Treffer`),next);main.append(pager);
      if(cart.size){const box=el('section','','cart');box.append(el('h2','Neuer Auftrag'),el('p',[...cart.values()].map(p=>`${p.quantity} × ${p.name}`).join(' · ')));box.append(button('Verwerfen',()=>{cart.clear();render();}),button('Auftrag anlegen',()=>modal('Auftrag anlegen',f=>{const label=el('label','Kunde'),s=el('select');s.name='customerId';for(const c of state.customers){const o=el('option',c.name);o.value=c.id;s.append(o);}label.append(s);f.append(label);field(f,'note','Notiz','text','Standardlieferung');},async v=>{if(await command({type:'order.create',...v,lines:[...cart.values()].map(({productId,quantity})=>({productId,quantity}))})){cart.clear();tab='orders';render();return true;}return false;}),'primary'));main.append(box);}
    }else if(tab==='orders'){
      main.append(el('h2','Aufträge'));if(!state.orders.length)main.append(el('p','Noch keine Aufträge. Wähle Artikel aus dem Katalog.'));
      for(const o of state.orders){const card=el('article','','order');card.append(el('h3',`${o.id} · ${state.customers.find(c=>c.id===o.customerId)?.name}`),el('p',o.status+' · '+money(o.total)),el('p',o.lines.map(l=>`${l.quantity} × ${l.name}`).join(' · ')),el('p',o.note));const acts=el('div','','actions');for(const [status,type,label]of [['draft','reserve','Reservieren'],['reserved','ship','Versenden'],['shipped','return','Retournieren'],['draft','cancel','Stornieren'],['reserved','cancel','Stornieren']])if(o.status===status)acts.append(button(label,()=>command({type:'order.'+type,id:o.id})));card.append(acts);main.append(card);}
    }else if(tab==='customers'){
      main.append(button('Kunde anlegen',()=>modal('Neuer Kunde',f=>{field(f,'name','Name');field(f,'city','Ort');},v=>command({type:'customer.create',...v})),'primary'),table(['Nummer','Name','Ort'],state.customers.map(c=>[c.id,c.name,c.city])));
    }else if(tab==='reports'){
      main.append(el('h2','Bestand & Auftragsstatus'),table(['Status','Anzahl'],Object.entries(state.summary.byStatus)),el('p',`${state.summary.lowStock} Artikel unter Mindestbestand`));for(const [path,text]of [['/export','JSON sichern'],['/report.csv','Bestand als CSV'],['/report.pdf','Bestand als PDF']]){const a=el('a',text,'download');a.href=api+path;a.download='';main.append(a);}
    }else main.append(el('h2','Änderungsjournal'),table(['Revision','Aktion','Zeitpunkt'],state.audit.map(a=>[a.id,a.type,a.at])));
  }
  load(); return ()=>root.replaceChildren();
}
