(function(){
  if(window.__sqCollectionRailRefinementsV4)return;
  window.__sqCollectionRailRefinementsV4=true;

  var ACCESS_ROOT='accessories-gifts-collectibles';
  var ACCESS_CATEGORIES=[
    ['challenge-coins-display-holders','Challenge Coins & Displays'],
    ['collectibles-cards','Collectibles & Cards'],
    ['drinkware-gifts','Drinkware'],
    ['keychains-lanyards','Keychains & Lanyards'],
    ['personalized-displays-memorials','Memorial & Personalized Gifts'],
    ['military-surplus-field-gear-collectibles','Military Surplus & Collectibles'],
    ['pins-buttons-small-insignia','Pins, Buttons & Small Insignia'],
    ['wallets-pocket-gifts','Wallets & Pocket Gifts']
  ];
  var ACCESS_HANDLES=ACCESS_CATEGORIES.map(function(x){return x[0]});

  function boot(){
    var rail=document.querySelector('[data-sq-collection-rail]');
    var main=document.getElementById('MainContent');
    if(!rail||!main)return;
    var timer=0,refinementData=null,refinementPromise=null;

    function pathInfo(){
      var bits=window.location.pathname.replace(/^\/+|\/+$/g,'').split('/');
      var handle=bits[0]==='collections'?(bits[1]||''):'';
      var tail=bits.slice(2).join('/');
      var isRoot=handle===ACCESS_ROOT;
      var isChild=ACCESS_HANDLES.indexOf(handle)!==-1;
      return {handle:handle,tail:tail,isAccessRoot:isRoot,isAccessFamily:isRoot||isChild,isAccessChild:isChild,isFinal:/sq-type-/i.test(tail)};
    }

    function markRail(info){
      rail.dataset.sqAccessoriesFamily=info.isAccessFamily?'true':'false';
      rail.dataset.sqAccessoriesRoot=info.isAccessRoot?'true':'false';
    }

    function group(name){
      return {item:rail.querySelector('[data-sq-context-'+name+']'),list:rail.querySelector('[data-sq-context-'+name+'-list]')};
    }
    function setLabel(item,label){
      if(!item)return;
      var trigger=item.querySelector(':scope > [data-sq-rail-trigger] span:first-child');
      var h=item.querySelector('.sq-collection-rail__flyout h2');
      if(trigger)trigger.textContent=label;
      if(h)h.textContent=label;
    }
    function routeKey(raw){
      try{var u=new URL(raw,location.origin);u.searchParams.delete('preview_theme_id');u.hash='';return u.pathname+'?'+u.searchParams.toString()}catch(_){return raw||''}
    }
    function currentKey(){return routeKey(location.href)}
    function renderRows(target,rows){
      if(!target.item||!target.list)return;
      var seen={},frag=document.createDocumentFragment();
      (rows||[]).forEach(function(row){
        if(!row||!row.href||!row.label)return;
        var key=routeKey(row.href);if(seen[key])return;seen[key]=true;
        var li=document.createElement('li'),a=document.createElement('a'),span=document.createElement('span');
        a.href=row.href;span.className='sq-collection-rail__link-label';span.textContent=row.label;a.appendChild(span);
        if(row.count){var small=document.createElement('small');small.className='sq-collection-rail__link-count';small.textContent=row.count;a.appendChild(small)}
        if(key===currentKey()||row.active)a.setAttribute('aria-current','page');li.appendChild(a);frag.appendChild(li);
      });
      target.list.replaceChildren(frag);target.item.hidden=target.list.children.length===0;
    }

    function seedAccessoryCategories(info){
      if(!info.isAccessFamily)return;
      renderRows(group('categories'),ACCESS_CATEGORIES.map(function(x){return {href:'/collections/'+x[0]+'?filter.v.availability=1',label:x[1]}}));
    }

    function labelForInput(input){
      var label='';
      if(input.id){try{var linked=main.querySelector('label[for="'+CSS.escape(input.id)+'"]');if(linked)label=linked.textContent||''}catch(_e){}}
      if(!label){var wrapped=input.closest&&input.closest('label');if(wrapped)label=wrapped.textContent||''}
      if(!label)label=input.dataset&&input.dataset.label||input.getAttribute('aria-label')||input.value||'';
      return String(label).replace(/\b\d+\s*items?\b/ig,'').replace(/\s+/g,' ').trim();
    }
    function facetHeading(input){
      var details=input.closest&&input.closest('details'),summary=details&&details.querySelector('summary');
      if(summary)return String(summary.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      return'';
    }
    function nativeInputs(){return Array.prototype.slice.call(main.querySelectorAll('input[name^="filter."]'))}
    function toggleHref(input){
      var u=new URL(location.href),name=input.name,value=input.value,vals=u.searchParams.getAll(name),found=vals.indexOf(value)!==-1;
      u.searchParams.delete(name);vals.filter(function(v){return v!==value}).forEach(function(v){u.searchParams.append(name,v)});if(!found)u.searchParams.append(name,value);u.searchParams.delete('page');
      return u.pathname+'?'+u.searchParams.toString();
    }
    function rowsFor(kind){
      var rows=[],seen={};
      nativeInputs().forEach(function(input){
        var name=String(input.name||''),heading=facetHeading(input),match=false;
        if(kind==='manufacturer')match=name==='filter.p.vendor'||/manufacturer|vendor|brand/.test(heading);
        if(kind==='color')match=/color|colour|pattern|camo|camouflage/.test(heading)||/color|colour|pattern|camo|camouflage/i.test(name);
        if(kind==='productType')match=name==='filter.p.product_type'||/product\s*type|item\s*type/.test(heading);
        if(!match||/price/i.test(name))return;
        var label=labelForInput(input);if(!label)return;
        var key=name+'\u0000'+input.value;if(seen[key])return;seen[key]=1;
        rows.push({href:toggleHref(input),label:label,active:input.checked===true});
      });
      rows.sort(function(a,b){return a.label.localeCompare(b.label)});return rows;
    }

    function handleize(text){return String(text||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
    function vendorHref(label){
      var u=new URL(location.href),vals=u.searchParams.getAll('filter.p.vendor'),active=vals.indexOf(label)!==-1;
      u.searchParams.delete('filter.p.vendor');vals.filter(function(v){return v!==label}).forEach(function(v){u.searchParams.append('filter.p.vendor',v)});if(!active)u.searchParams.append('filter.p.vendor',label);u.searchParams.delete('page');
      return u.pathname+'?'+u.searchParams.toString();
    }
    function typeHref(label,data){
      var wanted=String(label||'').replace(/\s+/g,' ').trim().toLowerCase(),tag=null;
      (data&&data.typeTags||[]).some(function(row){if(String(row&&row.label||'').replace(/\s+/g,' ').trim().toLowerCase()===wanted){tag=row;return true}return false});
      var u=new URL(location.href);
      if(tag&&tag.handle){
        var bits=u.pathname.replace(/^\/+|\/+$/g,'').split('/'),head=bits.slice(0,2),tail=bits.slice(2).join('/');
        var tags=tail?tail.split('+').filter(Boolean):[];
        tags=tags.filter(function(x){return !/^sq-type-/i.test(x)});
        if(tags.indexOf(tag.handle)===-1)tags.push(tag.handle);
        u.pathname='/'+head.concat(tags.length?[tags.join('+')]:[]).join('/');
        u.searchParams.delete('filter.p.product_type');
      }else u.searchParams.set('filter.p.product_type',label);
      u.searchParams.delete('page');
      if(!u.searchParams.has('filter.v.availability'))u.searchParams.set('filter.v.availability','1');
      return u.pathname+'?'+u.searchParams.toString();
    }
    function canonicalTypeRows(rows,data){
      return (rows||[]).map(function(row){return {label:row.label,active:row.active,href:typeHref(row.label,data)}});
    }
    function colorHref(color){
      var u=new URL(location.href),bits=u.pathname.replace(/^\/+|\/+$/g,'').split('/'),head=bits.slice(0,2),tail=bits.slice(2).join('/');
      var tags=tail?tail.split('+').filter(Boolean):[],h=color.handle||handleize(color.tag),idx=tags.indexOf(h);
      if(idx!==-1)tags.splice(idx,1);else tags.push(h);
      u.pathname='/'+head.concat(tags.length?[tags.join('+')]:[]).join('/');u.searchParams.delete('page');return u.pathname+'?'+u.searchParams.toString();
    }

    function dataUrl(){
      var u=new URL(location.href);u.searchParams.set('view','sq-refinement-data');u.searchParams.delete('page');return u.toString();
    }
    function loadRefinementData(){
      if(refinementData)return Promise.resolve(refinementData);
      if(refinementPromise)return refinementPromise;
      refinementPromise=fetch(dataUrl(),{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('refinement data '+r.status);return r.text()}).then(function(text){
        var start=text.indexOf('{'),end=text.lastIndexOf('}');if(start<0||end<start)throw new Error('refinement data malformed');
        refinementData=JSON.parse(text.slice(start,end+1));return refinementData;
      }).catch(function(){return {vendors:[],colors:[],types:[],typeTags:[]}});
      return refinementPromise;
    }

    function menuItem(key,title){
      var existing=rail.querySelector('[data-sq-refinement-key="'+key+'"]');if(existing)return existing;
      var li=document.createElement('li');li.className='sq-collection-rail__item sq-collection-rail__item--menu';li.setAttribute('data-sq-rail-menu-item','');li.setAttribute('data-sq-refinement-key',key);
      var id='sq-rail-refine-'+key;
      li.innerHTML='<button class="sq-collection-rail__trigger" type="button" aria-expanded="false" aria-controls="'+id+'" data-sq-rail-trigger><span>'+title+'</span><span class="sq-collection-rail__chevron" aria-hidden="true">›</span></button><div class="sq-collection-rail__flyout" id="'+id+'" data-sq-rail-flyout><div class="sq-collection-rail__flyout-inner"><h2>'+title+'</h2><ul class="sq-collection-rail__links" role="list" data-sq-refinement-list></ul></div></div>';
      var parent=rail.querySelector('.sq-collection-rail__primary'),org=rail.querySelector('[data-sq-context-organizations]');if(parent){if(org&&org.parentNode===parent)parent.insertBefore(li,org);else parent.appendChild(li)}standardizeRootShell();return li;
    }
    function standardizeRootShell(){
      if(rail.dataset.sqDepartmentRoot!=='true')return;
      var parent=rail.querySelector('.sq-collection-rail__primary');if(!parent)return;
      var shop=parent.querySelector(':scope > .sq-collection-rail__item:first-child');
      var categories=rail.querySelector('[data-sq-context-categories]');
      var subcategories=rail.querySelector('[data-sq-context-subcategories]');
      var legacyTypes=rail.querySelector('[data-sq-context-types]');
      var organizations=rail.querySelector('[data-sq-context-organizations]');
      var types=rail.querySelector('[data-sq-refinement-key="types"]');
      var price=rail.querySelector('[data-sq-refinement-key="price"]');
      var color=rail.querySelector('[data-sq-refinement-key="color-pattern"]');
      var manufacturer=rail.querySelector('[data-sq-refinement-key="manufacturer"]');

      /* Approved five-button root shell:
         Shop All -> Categories (contains Subcategories -> Types) -> Price -> Color / Pattern -> Manufacturer.
         Legacy standalone Subcategories, Types, and Organizations are deliberately suppressed. */
      if(categories)categories.hidden=false;
      [subcategories,legacyTypes,organizations,types].forEach(function(item){if(item)item.hidden=true});
      [price,color,manufacturer].forEach(function(item){
        if(!item)return;
        item.hidden=false;
        var list=item.querySelector('[data-sq-refinement-list]');
        if(list&&!list.children.length){
          var li=document.createElement('li'),span=document.createElement('span');
          span.className='sq-collection-rail__empty-note';
          span.textContent=item===price?'No price ranges are available.':(item===color?'No color / pattern filters are available.':'No manufacturer filters are available.');
          li.appendChild(span);list.appendChild(li);
        }
      });

      var anchor=shop;
      [categories,price,color,manufacturer].forEach(function(item){
        if(!item)return;
        if(anchor&&anchor.nextSibling!==item)parent.insertBefore(item,anchor.nextSibling);
        anchor=item;
      });
    }
    function fillRefinement(key,title,rows){
      var item=menuItem(key,title),list=item.querySelector('[data-sq-refinement-list]');
      if((!rows||!rows.length)&&list.children.length){item.hidden=false;return}
      var frag=document.createDocumentFragment();(rows||[]).forEach(function(row){var li=document.createElement('li'),a=document.createElement('a');a.className='sq-collection-rail__filter-row';a.href=row.href;a.textContent=row.label;if(row.active)a.setAttribute('aria-current','true');li.appendChild(a);frag.appendChild(li)});
      list.replaceChildren(frag);item.hidden=list.children.length===0;
    }
    function fillPrice(){
      var inputs=nativeInputs(),min=null,max=null;
      inputs.forEach(function(i){if(i.name==='filter.v.price.gte')min=i;if(i.name==='filter.v.price.lte')max=i});
      var item=menuItem('price','Price'),list=item.querySelector('[data-sq-refinement-list]');
      if(!min&&!max&&rail.dataset.sqDepartmentRoot!=='true'){if(!list.children.length)item.hidden=true;return}
      item.hidden=false;

      var minName=min&&min.name?min.name:'filter.v.price.gte';
      var maxName=max&&max.name?max.name:'filter.v.price.lte';
      var maxRaw=max&&(max.getAttribute('data-max')||max.max||max.placeholder)||'';
      var rangeMax=parseFloat(String(maxRaw).replace(/[^0-9.]/g,''));
      var bands=[[0,25],[25,50],[50,100],[100,250],[250,null]];
      if(isFinite(rangeMax)&&rangeMax>0){
        bands=bands.filter(function(b){return b[0]<rangeMax});
        if(rangeMax<25)bands=[[0,Math.ceil(rangeMax)]];
      }

      var current=new URL(location.href),activeMin=current.searchParams.get(minName)||'',activeMax=current.searchParams.get(maxName)||'';
      var frag=document.createDocumentFragment();
      bands.forEach(function(b){
        var lo=b[0],hi=b[1];
        var u=new URL(location.href);
        u.searchParams.delete(minName);u.searchParams.delete(maxName);u.searchParams.delete('page');
        if(lo>0)u.searchParams.set(minName,String(lo));
        if(hi!==null)u.searchParams.set(maxName,String(hi));
        var li=document.createElement('li'),a=document.createElement('a');
        a.className='sq-collection-rail__filter-row';
        a.href=u.pathname+'?'+u.searchParams.toString();
        a.textContent=hi===null?'$'+lo.toLocaleString()+'+':'$'+lo.toLocaleString()+' – $'+hi.toLocaleString();
        var sameMin=(activeMin||'')===(lo>0?String(lo):'');
        var sameMax=(activeMax||'')===(hi!==null?String(hi):'');
        if(sameMin&&sameMax)a.setAttribute('aria-current','true');
        li.appendChild(a);frag.appendChild(li);
      });
      list.replaceChildren(frag);
    }

    function applyStaticRefinements(info){
      if(rail.dataset.sqDepartmentRoot!=='true'&&!info.isAccessFamily)return;
      loadRefinementData().then(function(data){
        var nativeV=rowsFor('manufacturer');
        fillRefinement('manufacturer','Manufacturer',nativeV.length?nativeV:(data.vendors||[]).filter(Boolean).map(function(v){return {label:v,href:vendorHref(v),active:new URL(location.href).searchParams.getAll('filter.p.vendor').indexOf(v)!==-1}}));
        var nativeC=rowsFor('color');
        fillRefinement('color-pattern','Color / Pattern',nativeC.length?nativeC:(data.colors||[]).filter(function(c){return c&&c.label}).map(function(c){return {label:c.label,href:colorHref(c),active:location.pathname.indexOf(c.handle)!==-1}}));
        if(rail.dataset.sqDepartmentRoot==='true'){
          var manufacturer=rail.querySelector('[data-sq-refinement-key="manufacturer"]');
          var color=rail.querySelector('[data-sq-refinement-key="color-pattern"]');
          if(manufacturer)manufacturer.hidden=false;
          if(color)color.hidden=false;
          standardizeRootShell();
        }
        if(info.isAccessChild&&info.isFinal){
          var tg=group('types'),nativeT=canonicalTypeRows(rowsFor('productType'),data),fallbackT=(data.types||[]).filter(Boolean).map(function(t){return {label:t,href:typeHref(t,data),active:new URL(location.href).searchParams.get('filter.p.product_type')===t}});
          setLabel(tg.item,'Types');renderRows(tg,nativeT.length?nativeT:fallbackT);
        }
      });
    }

    function fetchAccessorySubcategories(info){
      if(!info.isAccessChild||!info.isFinal)return;
      var sg=group('subcategories');
      if(!sg.item||!sg.list||rail.dataset.sqAccessorySubcatsLoading==='true')return;
      if(sg.list.children.length){sg.item.hidden=false;return}
      rail.dataset.sqAccessorySubcatsLoading='true';
      var u=new URL('/collections/'+info.handle,location.origin),pv=new URL(location.href).searchParams.get('preview_theme_id');
      if(pv)u.searchParams.set('preview_theme_id',pv);
      u.searchParams.set('filter.v.availability','1');
      fetch(u.pathname+u.search,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('subcategory source '+r.status);return r.text()}).then(function(html){
        var doc=new DOMParser().parseFromString(html,'text/html'),rows=[];
        Array.prototype.forEach.call(doc.querySelectorAll('.sq-third-level__type[href]'),function(a){
          var n=a.querySelector('.sq-third-level__name'),label=String(n?n.textContent:a.textContent||'').replace(/\s+/g,' ').trim();
          if(label)rows.push({href:a.getAttribute('href'),label:label,active:location.pathname.indexOf(a.getAttribute('href').split('?')[0].split('/').pop())!==-1});
        });
        setLabel(sg.item,'Subcategories');renderRows(sg,rows);sg.item.hidden=rows.length===0;
      }).catch(function(){rail.dataset.sqAccessorySubcatsFailed='true'}).finally(function(){rail.dataset.sqAccessorySubcatsLoading='false'});
    }

    function applyAccessoryProgression(info){
      if(!info.isAccessFamily)return;
      var sg=group('subcategories'),tg=group('types');
      if(rail.dataset.sqDepartmentRoot==='true'){
        if(sg.item)sg.item.hidden=false;
        if(tg.item)tg.item.hidden=false;
        return;
      }
      seedAccessoryCategories(info);
      if(info.isAccessRoot){if(sg.item)sg.item.hidden=true;if(tg.item)tg.item.hidden=true;setLabel(sg.item,'Subcategories');setLabel(tg.item,'Types');return}
      if(info.isAccessChild&&!info.isFinal){
        if(sg.item)sg.item.hidden=true;setLabel(tg.item,'Subcategories');if(tg.item&&tg.list&&tg.list.children.length)tg.item.hidden=false;return;
      }
      if(info.isAccessChild&&info.isFinal){
        /* Keep the selected SQ Type choices available as Subcategories and reveal Shopify product Types as level three. */
        fetchAccessorySubcategories(info);
        setLabel(tg.item,'Types');var nativeT=rowsFor('productType');if(nativeT.length)renderRows(tg,nativeT);else if(tg.item)tg.item.hidden=true;
      }
    }

    function applyRefinements(){
      var info=pathInfo();markRail(info);fillPrice();applyAccessoryProgression(info);applyStaticRefinements(info);standardizeRootShell();
    }
    function schedule(){clearTimeout(timer);timer=setTimeout(applyRefinements,120)}
    applyRefinements();[300,900,1800,3500,6500].forEach(function(ms){setTimeout(applyRefinements,ms)});
    new MutationObserver(schedule).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','open','checked','value']});
    if(rail.dataset.sqDepartmentRoot!=='true')new MutationObserver(schedule).observe(rail,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
