const SIDChart = (() => {
  function render(holder, rows) {
    holder.replaceChildren();
    if(!rows.length){holder.textContent='Aún no hay resultados para este parámetro.';return;}
    const width=holder.clientWidth>0&&holder.clientWidth<600?480:800,height=270,pad={left:55,right:25,top:25,bottom:45};
    const min=Math.min(...rows.map(r=>Number(r.valor))),max=Math.max(...rows.map(r=>Number(r.valor)));
    const spread=max-min||Math.max(Math.abs(max)*.15,1),low=min-spread*.12,high=max+spread*.15;
    const times=rows.map(r=>new Date(r.fecha).getTime()),tmin=Math.min(...times),tmax=Math.max(...times);
    const pts=rows.map((r,n)=>({r,x:pad.left+(tmax===tmin?.5:(times[n]-tmin)/(tmax-tmin))*(width-pad.left-pad.right),y:height-pad.bottom-(Number(r.valor)-low)/(high-low)*(height-pad.top-pad.bottom)}));
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-label',`${rows[0].parametro}: ${rows.length} mediciones. Toca un punto para consultar el resultado.`);svg.setAttribute('role','group');
    const make=(name,attrs,text)=>{const el=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;};
    for(let n=0;n<=4;n++){const y=pad.top+n*(height-pad.top-pad.bottom)/4;svg.append(make('line',{x1:pad.left,x2:width-pad.right,y1:y,y2:y,class:'chart-grid'}));svg.append(make('text',{x:pad.left-10,y:y+4,'text-anchor':'end',class:'chart-label'},(high-n*(high-low)/4).toLocaleString('es-PA',{maximumFractionDigits:2})));}
    const points=pts.map(p=>`${p.x},${p.y}`).join(' ');
    svg.append(make('polygon',{points:`${pad.left},${height-pad.bottom} ${points} ${pts.at(-1).x},${height-pad.bottom}`,class:'chart-area'}));svg.append(make('polyline',{points,class:'chart-line'}));
    const readout=document.createElement('div');readout.className='chart-readout';readout.setAttribute('aria-live','polite');
    const circles=[];
    const choose=(p,n)=>{circles.forEach((c,k)=>{c.setAttribute('r',k===n?'7':'5');c.classList.toggle('is-selected',k===n);c.setAttribute('aria-pressed',String(k===n));});readout.replaceChildren();const value=document.createElement('strong');value.textContent=`${p.r.valor} ${p.r.unidad||''}`;const date=document.createElement('span');date.textContent=new Date(p.r.fecha).toLocaleString('es-PA');const who=document.createElement('small');who.textContent=(p.r.inspector||'').replace(/\s*\(DEMO\)/gi,'');readout.append(value,date,who);};
    pts.forEach((p,n)=>{const c=make('circle',{cx:p.x,cy:p.y,r:5,class:'chart-point',tabindex:0,role:'button','aria-label':`${new Date(p.r.fecha).toLocaleDateString('es-PA')}: ${p.r.valor} ${p.r.unidad||''}`});c.append(make('title',{},`${p.r.valor} ${p.r.unidad||''} · ${new Date(p.r.fecha).toLocaleDateString('es-PA')}`));c.addEventListener('pointerenter',()=>choose(p,n));c.addEventListener('focus',()=>choose(p,n));c.addEventListener('click',()=>choose(p,n));c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(p,n);}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();circles[(n+(e.key==='ArrowRight'?1:-1)+pts.length)%pts.length].focus();}});c.style.fill=({alerta:'#b73c38',intermedio:'#b37a13',bueno:'#19734c'})[p.r.estado]||'#61776b';circles.push(c);svg.append(c);if(n===0||n===pts.length-1||n%Math.max(1,Math.ceil(pts.length/4))===0)svg.append(make('text',{x:p.x,y:height-16,'text-anchor':'middle',class:'chart-label'},new Date(p.r.fecha).toLocaleDateString('es-PA',{day:'2-digit',month:'short'})));});
    svg.addEventListener('click',e=>{const box=svg.getBoundingClientRect();if(!box.width)return;const x=(e.clientX-box.left)/box.width*width;const n=pts.reduce((best,p,i)=>Math.abs(p.x-x)<Math.abs(pts[best].x-x)?i:best,0);choose(pts[n],n);});holder.append(svg,readout);choose(pts.at(-1),pts.length-1);
  }
  return {render};
})();
