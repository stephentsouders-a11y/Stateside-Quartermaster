(function(){
  function handleize(value){
    return String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function repair(){
    var rail=document.querySelector('[data-sq-collection-rail]');
    if(!rail)return;
    rail.querySelectorAll('a[href]').forEach(function(a){
      var u;
      try{u=new URL(a.getAttribute('href')||a.href,location.origin);}catch(_){return;}
      var type=u.searchParams.get('filter.p.product_type');
      if(!type)return;
      var bits=u.pathname.replace(/^\/+|\/+$/g,'').split('/');
      if(bits[0]!=='collections'||!bits[1])return;
      u.pathname='/collections/'+bits[1]+'/'+handleize('SQ Type: '+type);
      u.searchParams.delete('filter.p.product_type');
      u.searchParams.delete('page');
      if(!u.searchParams.has('filter.v.availability'))u.searchParams.set('filter.v.availability','1');
      a.href=u.pathname+(u.search?'?'+u.searchParams.toString():'');
      a.dataset.sqRouteRepaired='product-type-tag';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repair,{once:true});else repair();
  new MutationObserver(repair).observe(document.documentElement,{childList:true,subtree:true});
})();