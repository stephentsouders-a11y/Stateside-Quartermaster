(function(){
  if(window.__sqSidebarRouteResolverV2)return;
  window.__sqSidebarRouteResolverV2=true;

  function boot(){
    var rail=document.querySelector('[data-sq-collection-rail]');
    if(!rail)return;
    var cache={};
    var preview=new URL(location.href).searchParams.get('preview_theme_id')||'';

    function handleize(value){
      return String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    }
    function collectionParts(u){
      var bits=u.pathname.replace(/^\/+|\/+$/g,'').split('/');
      return bits[0]==='collections'&&bits[1]?bits:null;
    }
    function cleanLabel(value){
      return String(value||'').replace(/\s+/g,' ').trim();
    }
    function dataUrl(handle){
      var u=new URL('/collections/'+handle,location.origin);
      u.searchParams.set('view','sq-refinement-data');
      if(preview)u.searchParams.set('preview_theme_id',preview);
      return u.href;
    }
    function parsePayload(text){
      var start=text.indexOf('{'),end=text.lastIndexOf('}');
      if(start<0||end<start)throw new Error('refinement data malformed');
      return JSON.parse(text.slice(start,end+1));
    }
    function loadData(handle){
      if(cache[handle])return cache[handle];
      cache[handle]=fetch(dataUrl(handle),{credentials:'same-origin'}).then(function(r){
        if(!r.ok)throw new Error('refinement data '+r.status);
        return r.text();
      }).then(parsePayload).catch(function(){return {typeTags:[]}});
      return cache[handle];
    }
    function matchingTypeTag(data,type){
      var wanted=cleanLabel(type).toLowerCase();
      var rows=data&&Array.isArray(data.typeTags)?data.typeTags:[];
      for(var i=0;i<rows.length;i++){
        var row=rows[i]||{};
        if(cleanLabel(row.label).toLowerCase()===wanted)return row;
      }
      return null;
    }
    function tagRoute(source,tag){
      var u=new URL(source.href),bits=collectionParts(u);
      if(!bits)return null;
      var tail=bits.slice(2).join('/');
      var tags=tail?tail.split('+').filter(Boolean):[];
      tags=tags.filter(function(x){return !/^sq-type-/i.test(x)});
      var h=tag&&tag.handle?tag.handle:handleize(tag&&tag.tag?tag.tag:'SQ Type: '+u.searchParams.get('filter.p.product_type'));
      if(tags.indexOf(h)===-1)tags.push(h);
      u.pathname='/collections/'+bits[1]+'/'+tags.join('+');
      u.searchParams.delete('filter.p.product_type');
      u.searchParams.delete('page');
      if(!u.searchParams.has('filter.v.availability'))u.searchParams.set('filter.v.availability','1');
      return u;
    }
    function repairLink(a){
      if(!a||!a.getAttribute)return Promise.resolve(false);
      var raw=a.getAttribute('href')||a.href||'',u;
      try{u=new URL(raw,location.origin)}catch(_){return Promise.resolve(false)}
      var type=u.searchParams.get('filter.p.product_type'),bits=collectionParts(u);
      if(!type||!bits)return Promise.resolve(false);
      if(a.dataset.sqRouteState==='repaired')return Promise.resolve(true);
      a.dataset.sqRouteState='pending';
      return loadData(bits[1]).then(function(data){
        var tag=matchingTypeTag(data,type);
        if(!tag){a.dataset.sqRouteState='native';return false}
        var fixed=tagRoute(u,tag);
        if(!fixed){a.dataset.sqRouteState='native';return false}
        a.href=fixed.pathname+fixed.search+fixed.hash;
        a.dataset.sqRouteState='repaired';
        a.dataset.sqRouteRepaired='product-type-tag';
        return true;
      });
    }
    function repairAll(){
      rail.querySelectorAll('a[href*="filter.p.product_type"]').forEach(function(a){repairLink(a)});
    }
    function repairLocation(){
      var u=new URL(location.href),type=u.searchParams.get('filter.p.product_type'),bits=collectionParts(u);
      if(!type||!bits)return Promise.resolve(false);
      return loadData(bits[1]).then(function(data){
        var tag=matchingTypeTag(data,type);
        if(!tag)return false;
        var fixed=tagRoute(u,tag);
        if(!fixed||fixed.href===u.href)return false;
        location.replace(fixed.href);
        return true;
      });
    }

    rail.addEventListener('click',function(e){
      var a=e.target.closest&&e.target.closest('a[href*="filter.p.product_type"]');
      if(!a||!rail.contains(a)||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      if(a.dataset.sqRouteState==='repaired')return;
      e.preventDefault();
      e.stopImmediatePropagation();
      repairLink(a).then(function(){location.assign(a.href)}).catch(function(){location.assign(a.href)});
    },true);

    var timer=0;
    new MutationObserver(function(){
      clearTimeout(timer);
      timer=setTimeout(repairAll,40);
    }).observe(rail,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});

    window.__sqSidebarRouteResolver={
      version:'2',
      repairAll:repairAll,
      repairLink:repairLink,
      loadData:loadData
    };
    rail.dataset.sqRoutingController='canonical-v2';
    repairAll();
    repairLocation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();