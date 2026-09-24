(function(){
  if(window.__sqCollectionRailCascadeV1)return;
  window.__sqCollectionRailCascadeV1=true;
  function boot(){
    var rail=document.querySelector('[data-sq-collection-rail][data-sq-department-root="true"]');
    if(!rail)return;
    if(rail.dataset.sqStateGuardComponentRoot==='true')return;
    var catItem=rail.querySelector('[data-sq-context-categories]');
    var catList=rail.querySelector('[data-sq-context-categories-list]');
    if(!catItem||!catList)return;
    var flyout=catItem.querySelector(':scope > .sq-collection-rail__flyout');
    var inner=flyout&&flyout.querySelector('.sq-collection-rail__flyout-inner');
    if(!flyout||!inner)return;
    catItem.classList.add('sq-collection-rail__item--cascade');
    function alignCascade(){
      if(rail.classList.contains('sq-inline-accordion')){
        flyout.style.removeProperty('top');flyout.style.removeProperty('bottom');flyout.style.removeProperty('height');
        inner.style.removeProperty('padding-top');inner.style.removeProperty('height');return
      }
      if(!matchMedia('(min-width: 990px)').matches){flyout.style.removeProperty('top');inner.style.removeProperty('padding-top');return}
      var trigger=catItem.querySelector(':scope > [data-sq-rail-trigger]');
      if(!trigger)return;
      var top=Math.max(0,Math.round(trigger.getBoundingClientRect().top));
      flyout.style.setProperty('top',top+'px','important');
      flyout.style.setProperty('bottom','0','important');
      inner.style.setProperty('padding-top','0','important');
      inner.style.setProperty('height','calc(100vh - '+top+'px)','important');
    }
    var subCol=document.createElement('section');
    subCol.className='sq-collection-rail__cascade-column';
    subCol.setAttribute('data-sq-cascade-subcategories','');
    subCol.innerHTML='<h2>Subcategories</h2><p class="sq-collection-rail__cascade-note">Hover a category to view its subcategories.</p><ul class="sq-collection-rail__links" role="list" data-sq-cascade-subcategory-list></ul>';
    var typeCol=document.createElement('section');
    typeCol.className='sq-collection-rail__cascade-column';
    typeCol.setAttribute('data-sq-cascade-types','');
    typeCol.innerHTML='<h2>Types</h2><p class="sq-collection-rail__cascade-note">Hover a subcategory to view product types.</p><ul class="sq-collection-rail__links" role="list" data-sq-cascade-type-list></ul>';
    inner.appendChild(subCol);inner.appendChild(typeCol);
    subCol.hidden=true;typeCol.hidden=true;
    var subList=subCol.querySelector('[data-sq-cascade-subcategory-list]');
    var typeList=typeCol.querySelector('[data-sq-cascade-type-list]');
    var cache={};
    function cleanLabel(a){
      var n=a.querySelector('.sq-subcategory-name,.sq-third-level__name,.sq-ts-match-name,.sq-books-tree__copy strong,.sq-ptype-browser__name,.vac-service-card__name,.vac-armor-browser__name,strong,h3');
      return String(n?n.textContent:a.textContent||'').replace(/\b\d[\d,]*\s+(?:items?|products?)\b/ig,'').replace(/\s+/g,' ').trim();
    }
    function countText(a){
      var n=a.querySelector('.sq-subcategory-count,.sq-third-level__type-count,.sq-ts-match-count,.sq-books-tree__copy small,.sq-ptype-browser__card-count,.vac-service-card__meta,.vac-armor-browser__meta');
      return n?String(n.textContent||'').replace(/\s+/g,' ').trim():'';
    }
    function row(a){
      var href=a.getAttribute('href')||'';var label=cleanLabel(a);if(!href||!label)return null;
      try{var u=new URL(href,location.origin);return {href:u.pathname+u.search,label:label,count:countText(a)}}catch(_){return null}
    }
    function unique(rows){
      var seen={};return rows.filter(function(r){if(!r)return false;var k=r.href+'|'+r.label;if(seen[k])return false;seen[k]=1;return true});
    }
    function parse(doc){
      var subs=[],types=[],direct=[];
      doc.querySelectorAll('.sq-subcategory-section:not([data-sq-root-rail-source]) .sq-subcategory-card[href],.vac-uniform-insignia-button__link[href]').forEach(function(a){subs.push(row(a))});
      doc.querySelectorAll('.sq-third-level .sq-third-level__type[href],.sq-thin-stabrite-types .sq-ts-match-card[href],.sq-books-tree[data-mode="type"] .sq-books-tree__card[href],.sq-ptype-browser__card[href],.vac-service-card[href],.vac-armor-browser__card[href],.vac-knives-browser__button[href]').forEach(function(a){direct.push(row(a))});
      doc.querySelectorAll('.sqbfl-grid .sqbfl-card[href]').forEach(function(a){
        var r=row(a);if(!r)return;
        try{
          var u=new URL(r.href,location.origin);
          if(u.searchParams.has('sq_bfl_type'))direct.push(r);
          else if(u.searchParams.has('sq_bfl_subcategory'))subs.push(r);
          else if(u.searchParams.has('sq_bfl_category'))subs.push(r);
        }catch(_e){}
      });
      doc.querySelectorAll('input[name="filter.p.product_type"]').forEach(function(input){
        if(input.disabled)return;
        var label='',linked=null;
        if(input.id){try{linked=doc.querySelector('label[for="'+CSS.escape(input.id)+'"]')}catch(_e){}}
        if(linked)label=linked.textContent||'';
        if(!label){var wrapped=input.closest&&input.closest('label');if(wrapped)label=wrapped.textContent||''}
        var rawLabel=String(label||input.value||'');
        if(/\(\s*0\s*\)|\b0\s+(?:items?|products?)\b/i.test(rawLabel))return;
        label=rawLabel.replace(/\b\d+\s*(?:items?|products?)\b/ig,'').replace(/\s+/g,' ').trim();
        if(label&&input.value){
          var u=new URL(doc.location&&doc.location.href?doc.location.href:location.href,location.origin);
          var bits=u.pathname.replace(/^\/+|\/+$/g,'').split('/'),head=bits.slice(0,2),tail=bits.slice(2).join('/');
          var tags=tail?tail.split('+').filter(Boolean):[];
          tags=tags.filter(function(x){return !/^sq-type-/i.test(x)});
          var typeHandle=String('SQ Type: '+input.value).toLowerCase().trim().replace(/['’‘]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
          if(tags.indexOf(typeHandle)===-1)tags.push(typeHandle);
          u.pathname='/'+head.concat(tags.length?[tags.join('+')]:[]).join('/');
          u.searchParams.delete('filter.p.product_type');u.searchParams.delete('page');
          if(!u.searchParams.has('filter.v.availability'))u.searchParams.set('filter.v.availability','1');
          types.push({href:u.pathname+'?'+u.searchParams.toString(),label:label,count:''});
        }
      });
      return {subcategories:unique(subs),types:unique(types),direct:unique(direct)};
    }
    function fetchHierarchy(href){
      var key=href;if(cache[key])return cache[key];
      var u=new URL(href,location.origin),category=u.searchParams.get('sq_bfl_category')||'',subcategory=u.searchParams.get('sq_bfl_subcategory')||'';
      if(category&&window.__sqBflSidebarApi&&window.__sqBflSidebarApi.ready){
        cache[key]=window.__sqBflSidebarApi.ready.then(function(){var d=window.__sqBflSidebarApi.hierarchy(category,subcategory)||{};return {subcategories:unique((d.subcategories||[]).map(function(x){return {href:x.href,label:x.label,count:''}})),types:unique((d.types||[]).map(function(x){return {href:x.href,label:x.label,count:''}})),direct:[]}}).catch(function(){return {subcategories:[],types:[],direct:[]}});
        return cache[key];
      }
      var pv=new URL(location.href).searchParams.get('preview_theme_id');
      if(pv)u.searchParams.set('preview_theme_id',pv);
      if(!u.searchParams.has('filter.v.availability'))u.searchParams.set('filter.v.availability','1');
      cache[key]=fetch(u.pathname+u.search,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.text()}).then(function(html){return parse(new DOMParser().parseFromString(html,'text/html'))}).catch(function(){return {subcategories:[],types:[],direct:[]}});
      return cache[key];
    }
    function render(list,rows,kind){
      var frag=document.createDocumentFragment();
      rows.forEach(function(r){
        var li=document.createElement('li'),a=document.createElement('a'),s=document.createElement('span');
        a.href=r.href;a.dataset.sqCascadeKind=kind;s.className='sq-collection-rail__link-label';s.textContent=r.label;a.appendChild(s);
        if(r.count&&rail.dataset.sqDepartmentRoot!=='true'){var small=document.createElement('small');small.className='sq-collection-rail__link-count';small.textContent=r.count;a.appendChild(small)}
        li.appendChild(a);frag.appendChild(li);
      });
      list.replaceChildren(frag);
    }
    function setNote(col,text){var p=col.querySelector('.sq-collection-rail__cascade-note');if(p)p.textContent=text}
    function seedCategoriesFromBfl(){
      if(catList.dataset.sqBflCanonicalSeeded==='true')return;
      var api=window.__sqBflSidebarApi;
      if(!api||!api.ready||!api.categories)return;
      api.ready.then(function(){
        if(catList.dataset.sqBflCanonicalSeeded==='true')return;
        var rows=api.categories()||[],frag=document.createDocumentFragment();
        rows.forEach(function(r){
          if(!r||!r.href||!r.label)return;
          var li=document.createElement('li'),a=document.createElement('a'),s=document.createElement('span');
          a.href=r.href;s.className='sq-collection-rail__link-label';s.textContent=r.label;a.appendChild(s);li.appendChild(a);frag.appendChild(li);
        });
        if(rows.length){catList.replaceChildren(frag);catList.dataset.sqBflCanonicalSeeded='true';catItem.hidden=false}
      }).catch(function(){});
    }
    seedCategoriesFromBfl();
    window.addEventListener('sq:bfl-api-ready',seedCategoriesFromBfl);
    function loadCategory(a){
      if(!a||!a.href)return;
      var host=a.closest('li');
      if(host&&subCol.parentNode!==host)host.appendChild(subCol);
      subCol.hidden=false;typeCol.hidden=true;
      catList.querySelectorAll('a').forEach(function(x){x.classList.toggle('is-cascade-active',x===a);x.setAttribute('aria-expanded',x===a?'true':'false')});
      setNote(subCol,'Loading…');setNote(typeCol,'Select a subcategory to view product types.');subList.replaceChildren();typeList.replaceChildren();
      return fetchHierarchy(a.href).then(function(data){
        var subs=data.subcategories||[],direct=data.direct||[],types=data.types||[];
        if(subs.length){
          setNote(subCol,'');subCol.querySelector('h2').textContent='Subcategories';render(subList,subs,'subcategory');
          if(types.length){setNote(typeCol,'');render(typeList,types,'type')}else setNote(typeCol,'Select a subcategory to view product types.');
        }else if(types.length||direct.length){
          var leaves=types.length?types:direct;
          subCol.querySelector('h2').textContent='Types';setNote(subCol,'');render(subList,leaves,'type');setNote(typeCol,'');
        }else{
          subCol.querySelector('h2').textContent='Subcategories';setNote(subCol,'No additional subcategories.');setNote(typeCol,'');
        }
        return !!(subs.length||types.length||direct.length);
      });
    }
    function loadSubcategory(a){
      if(!a||!a.href||a.dataset.sqCascadeKind!=='subcategory')return;
      catItem.classList.add('is-open');
      var host=a.closest('li');
      if(host&&typeCol.parentNode!==host)host.appendChild(typeCol);
      typeCol.hidden=false;
      subList.querySelectorAll('a').forEach(function(x){x.classList.toggle('is-cascade-active',x===a);x.setAttribute('aria-expanded',x===a?'true':'false')});
      setNote(typeCol,'Loading…');typeList.replaceChildren();
      return fetchHierarchy(a.href).then(function(data){
        var rows=(data.types&&data.types.length)?data.types:((data.direct&&data.direct.length)?data.direct:[]);
        if(rows.length){setNote(typeCol,'');render(typeList,rows,'type')}else setNote(typeCol,'No additional product types.');
        return rows.length>0;
      });
    }
    window.__sqSidebarTreeDataApis=window.__sqSidebarTreeDataApis||{};
    window.__sqSidebarTreeDataApis.generic={
      mode:'generic',
      activateCategory:loadCategory,
      activateSubcategory:loadSubcategory,
      categoryList:catList,
      subcategoryList:subList,
      typeList:typeList,
      subcategoryPanel:subCol,
      typePanel:typeCol,
      categoryItem:catItem
    };
    window.__sqSidebarTreeDataApi=window.__sqSidebarTreeDataApis.generic;
    window.dispatchEvent(new CustomEvent('sq:sidebar-tree-data-ready',{detail:{mode:'generic'}}));
    /* Interaction ownership transferred to sq-sidebar-tree-controller-v2.js. */
    /*
    function bindList(list,handler){
      list.addEventListener('click',function(e){
        var a=e.target.closest('a[href]');if(!a||!list.contains(a))return;
        if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
        e.preventDefault();e.stopPropagation();
        var already=a.classList.contains('is-cascade-active');
        if(already){
          a.classList.remove('is-cascade-active');a.setAttribute('aria-expanded','false');
          if(list===catList){subCol.hidden=true;typeCol.hidden=true}
          else if(list===subList){typeCol.hidden=true}
          return;
        }
        handler(a);
      });
      list.addEventListener('pointerover',function(e){if(!matchMedia('(min-width: 990px)').matches||e.pointerType==='touch')return;var a=e.target.closest('a[href]');if(a&&list.contains(a)&&!a.classList.contains('is-cascade-active'))handler(a)});
      list.addEventListener('focusin',function(e){var a=e.target.closest('a[href]');if(a&&list.contains(a)&&!a.classList.contains('is-cascade-active'))handler(a)});
    }
    bindList(catList,loadCategory);bindList(subList,loadSubcategory);
    [flyout,subCol,typeCol].forEach(function(el){
      el.addEventListener('pointerenter',function(){var trigger=catItem.querySelector(':scope > [data-sq-rail-trigger]');alignCascade();catItem.classList.add('is-open');if(trigger)trigger.setAttribute('aria-expanded','true')});
    });
    var mo=new MutationObserver(function(){if(!catList.children.length||!catItem.classList.contains('is-open'))return;if(catList.querySelector('.is-cascade-active'))return;var first=catList.querySelector('a[href]');if(first)loadCategory(first)});
    mo.observe(catList,{childList:true});
    catItem.addEventListener('pointerenter',function(){alignCascade();var first=catList.querySelector('a[href]');if(first&&!catList.querySelector('.is-cascade-active'))loadCategory(first)});
    window.addEventListener('resize',function(){if(catItem.classList.contains('is-open'))alignCascade()});
    window.addEventListener('scroll',function(){if(catItem.classList.contains('is-open'))alignCascade()},{passive:true});
    */
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();