/* LUMEN 3 — transparent, deterministic catalog guide. Answers use only app.books.
   There is no remote AI, external API, or invented inventory availability. */
'use strict';
const QUICK_PROMPTS=['GATE CSE books','Harry Potter availability','UPSC preparation','CAT preparation'];
const EXAM_RECS={
  'gate-cs':{name:'GATE Computer Science (CSE)',books:[['BK-103','Algorithms and complexity'],['BK-114','Operating systems'],['BK-116','Databases / SQL'],['BK-112','Computer networks'],['BK-128','Discrete mathematics'],['BK-129','Theory of computation'],['BK-119','Computer organization']]},
  'gate-da':{name:'GATE Data Science & AI (DA)',books:[['BK-133','Probability and statistics'],['BK-134','Linear algebra'],['BK-130','Machine-learning theory'],['BK-110','Applied machine learning'],['BK-106','Deep learning']]},
  'gate-ec':{name:'GATE Electronics (ECE)',books:[['BK-137','Signals and systems'],['BK-139','Analog and digital circuits'],['BK-138','Control systems'],['BK-118','Digital design'],['BK-132','Engineering mathematics']]},
  'gate-me':{name:'GATE Mechanical Engineering',books:[['BK-142','Thermodynamics'],['BK-141','Strength of materials'],['BK-132','Engineering mathematics'],['BK-138','Control systems']]},
  'gate-ee':{name:'GATE Electrical Engineering',books:[['BK-140','Electrical machines'],['BK-137','Signals and systems'],['BK-138','Control systems'],['BK-132','Engineering mathematics']]},
  'upsc':{name:'UPSC / Civil Services',books:[['BK-177','Polity / governance'],['BK-178','Indian economy'],['BK-179','Geography'],['BK-175','English foundation']]},
  'ssc':{name:'SSC / Government recruitment',books:[['BK-173','Quantitative aptitude'],['BK-174','Reasoning'],['BK-175','English grammar'],['BK-176','Vocabulary']]},
  'cat':{name:'CAT / MBA entrance',books:[['BK-180','Quantitative aptitude'],['BK-181','Data interpretation'],['BK-176','Verbal preparation'],['BK-174','Logical reasoning']]},
  'jee':{name:'JEE preparation',books:[['BK-135','Physics fundamentals'],['BK-182','Mathematics problems'],['BK-184','Chemistry foundation'],['BK-136','Physics reference']]},
  'neet':{name:'NEET preparation',books:[['BK-183','Biology foundation'],['BK-184','Chemistry foundation'],['BK-135','Physics fundamentals'],['BK-136','Additional physics practice']]},
  'banking':{name:'Banking examinations',books:[['BK-173','Quantitative aptitude'],['BK-174','Reasoning'],['BK-175','English grammar'],['BK-176','Vocabulary']]},
  'placements':{name:'Software interviews / placements',books:[['BK-127','Coding interview data structures'],['BK-125','Algorithm intuition'],['BK-121','C programming'],['BK-126','System design'],['BK-102','Code quality']]}
};
function normalizeAsk(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
const ASK_STOP=new Set('the a an is are do does have available availability show find search looking for want need please can you me i my in of for to books book copy copies library there any recommend suggest about with on which some what where could tell get preparing prepare preparation exam exams best good read reading help hello hi hey'.split(' '));
function inferExam(q){
  if(/\b(gate|graduate aptitude test)\b/.test(q)){
    if(/\b(da|data science|artificial intelligence|ai|ml)\b/.test(q))return 'gate-da';
    if(/\b(ece|ec|electronics|communication)\b/.test(q))return 'gate-ec';
    if(/\b(me|mechanical)\b/.test(q))return 'gate-me';
    if(/\b(ee|electrical)\b/.test(q))return 'gate-ee';
    return 'gate-cs';
  }
  if(/\b(upsc|civil services|ias|ips)\b/.test(q))return 'upsc';
  if(/\b(ssc|cgl|chsl)\b/.test(q))return 'ssc';
  if(/\b(cat|mba|management aptitude)\b/.test(q))return 'cat';
  if(/\b(jee|iit jee|iitjee)\b/.test(q))return 'jee';
  if(/\b(neet|medical entrance)\b/.test(q))return 'neet';
  if(/\b(bank|banking|ibps|sbi po)\b/.test(q))return 'banking';
  if(/\b(placement|placements|interview|coding rounds)\b/.test(q))return 'placements';
  return null;
}
const SUBJECT_ALIASES={
  'dsa':'data structures algorithms','os':'operating system','dbms':'database','sql':'database','cn':'computer networks','coa':'computer organization','toc':'theory computation','ml':'machine learning','ai':'artificial intelligence','scifi':'science fiction',
  'harry potter':'harry potter','story':'fiction','stories':'fiction','novels':'fiction','novel':'fiction','fantasy':'fantasy','thriller':'mystery thriller'
};
function scoreBook(b,q){
  const original=LUMEN_CATALOG.find(x=>x.id===b.id);
  const meta=original && normalizeAsk(original.title)===normalizeAsk(b.title) && original.category===shelfFor(b) ? original : null;
  const title=normalizeAsk(b.title),author=normalizeAsk(b.author),id=normalizeAsk(b.id),category=normalizeAsk(shelfFor(b)),tags=normalizeAsk(meta?.tags||'');
  const ids=q.match(/\bbk\s?\d{3}\b/g)||[];
  if(ids.length&&ids.some(x=>normalizeAsk(x)===id))return 1000;
  let search=q;
  for(const [short,long] of Object.entries(SUBJECT_ALIASES)){
    if(search===short || search.includes(' '+short+' ') || search.startsWith(short+' ') || search.endsWith(' '+short))search+=' '+long;
  }
  const tokens=[...new Set(search.split(' ').filter(x=>x.length>1&&!ASK_STOP.has(x)))];
  if(!tokens.length)return 0;
  let score=0;
  const phrase=tokens.join(' ');
  if(phrase.length>2&&title.includes(phrase))score+=70;
  if(phrase.length>2&&tags.includes(phrase))score+=21;
  for(const token of tokens){
    if(title.split(' ').includes(token))score+=12;
    else if(title.includes(token)&&token.length>=4)score+=7;
    if(author.split(' ').includes(token))score+=7;
    if(tags.split(' ').includes(token))score+=4;
    if(category.split(' ').includes(token))score+=3;
  }
  return score;
}
function chatAnswer(text){
  const q=normalizeAsk(text),exam=inferExam(q);
  if(!q)return {intro:'Tell me a title, author, book ID, subject, or exam.'};
  if(/^(hi|hello|hey|help|what can you do)/.test(q))return {intro:`I can search ${app.books.length} registered titles, check how many copies are currently available, and compare preparation books for GATE, UPSC, SSC, CAT, JEE, NEET and placements. Try a specific title or one of the example questions below.`};
  
const libraryKeywords =
  /\b(book|books|author|title|library|novel|story|fiction|read|reading|available|availability|copy|copies|stock|borrow|issue|return|recommend|suggest|gate|upsc|ssc|cat|jee|neet|exam|exams|preparation|dsa|dbms|algorithms)\b/;

const irrelevantTopics =
  /\b(weather|lunch|breakfast|dinner|joke|sports|cricket|football|recipe|president|politics)\b/;

const generalQuestion =
  /^(how|what|who|why|when|where|tell me|explain|write|solve|calculate)\b/;

if (
  !libraryKeywords.test(q) &&
  (irrelevantTopics.test(q) || generalQuestion.test(q))
) {
  return {intro: 'not relevant prompt'};
}

   if(exam){
    const profile=EXAM_RECS[exam];
    const recs=profile.books.map(([id,reason])=>({book:bookOf(id),reason})).filter(x=>x.book && normalizeAsk(x.book.title)===normalizeAsk(LUMEN_CATALOG.find(b=>b.id===x.book.id)?.title||''));
    const available=recs.filter(x=>x.book.availableCopies>0),out=recs.filter(x=>x.book.availableCopies===0);
    const shortlist=[...available,...out].slice(0,6);
    const note=available.length ? `I ranked matching titles by topic usefulness and current availability. ${available.length} of these suggested titles have borrowable copies. These books cover individual subjects; they aren't a complete exam syllabus.` : 'All matching titles are currently out of stock. Their details are shown, but I cannot reserve a copy.';
    return {intro:`For ${profile.name}, these are useful starting points from our catalog. ${note}`,books:shortlist,kind:'exam'};
  }
  if(/\b(only unavailable|out of stock|unavailable books)\b/.test(q)){
    const found=app.books.filter(b=>b.availableCopies===0).slice(0,6);
    return {intro:found.length?'These catalog titles currently have no available copies:':'No titles are currently out of stock.',books:found.map(book=>({book,reason:'Currently checked out or no copies on shelf'})),kind:'stock'};
  }
  const ranked=app.books.map(book=>({book,score:scoreBook(book,q)})).filter(x=>x.score>=4);
  // Stable sort uses explicit score then availability; no guesswork about unavailable books.
  ranked.sort((a,b)=>b.score-a.score || Number(b.book.availableCopies>0)-Number(a.book.availableCopies>0) || a.book.title.localeCompare(b.book.title));
  if(ranked.length){
    const top=ranked.slice(0,6).map(x=>({book:x.book,reason:x.score>=70?'Closest title match':shelfFor(x.book)}));
    const named=top.length===1?'I found a matching title.':'These titles are the closest matches in our collection.';
    return {intro:`${named} Copy counts are read directly from the current inventory.`,books:top,kind:'search'};
  }
   
if (!libraryKeywords.test(q)) {
  return {intro: 'not relevant prompt'};
}

  return {intro:`I couldn't locate a reliable match for “${text.trim()}” among the ${app.books.length} registered titles. Try the author, a shorter title, a subject such as “DBMS”, or an exam like “GATE CSE”. I won't claim the library holds a book unless it appears in the catalog.`};
}
function chatWelcome(){return {role:'assistant',intro:`Welcome to the Lumen reading desk. Ask whether a book is available, explore fiction, or get a subject-wise shortlist for competitive exams. All stock numbers come from the library's current records.`}}
function renderChatMessage(msg){
  if(msg.role==='user')return `<div class="chat-message from-user"><div class="chat-bubble">${escapeHtml(msg.text)}</div></div>`;
  const books=msg.books||[];
  return `<div class="chat-message from-bot"><span class="chat-bot-dot">✳</span><div class="chat-reply"><p>${escapeHtml(msg.intro)}</p>${books.length?`<div class="chat-book-list">${books.map(({book,reason},i)=>{book=bookOf(book.id)||book;return `<div class="chat-book-row"><div class="chat-book-rank">${i+1}</div><div class="chat-book-copy"><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(reason||shelfFor(book))} · ${escapeHtml(book.id)}</small><span class="chip ${book.availableCopies>0?'green':'red'}">${book.availableCopies>0?`${book.availableCopies} available`:'Not available'}</span></div><button class="chat-book-open" data-show-book="${escapeHtml(book.id)}" title="Show in catalog" aria-label="Find ${escapeHtml(book.title)} in the catalog">${ico('arrow')}</button></div>`}).join('')}</div>`:''}</div></div>`;
}
function chatContent(){if(!app.chatHistory.length)app.chatHistory=[chatWelcome()];return app.chatHistory.map(renderChatMessage).join('')}
function quickPromptMarkup(){return QUICK_PROMPTS.map(p=>`<button type="button" class="chat-prompt" data-chat-prompt="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
function syncChatWidget(){
  $('#chatWidget').hidden=!app.chatOpen;
  $('#chatLauncher').hidden=app.chatOpen;
  if($('#widgetChatThread')){$('#widgetChatThread').innerHTML=chatContent();$('#widgetChatThread').scrollTop=$('#widgetChatThread').scrollHeight}
  if($('#widgetQuickPrompts'))$('#widgetQuickPrompts').innerHTML=quickPromptMarkup();
  const thread=$('#assistantPageThread');if(thread){thread.innerHTML=chatContent();thread.scrollTop=thread.scrollHeight}
}
function toggleChat(value){app.chatOpen=Boolean(value);syncChatWidget();if(app.chatOpen)$('#chatWidget [name="message"]')?.focus()}
function sendChat(text){const value=String(text||'').trim().slice(0,240);if(!value)return;if(!app.chatHistory.length)app.chatHistory=[chatWelcome()];app.chatHistory.push({role:'user',text:value});app.chatHistory.push({role:'assistant',...chatAnswer(value)});if(app.chatHistory.length>35)app.chatHistory=[chatWelcome(),...app.chatHistory.slice(-32)];syncChatWidget()}
function renderAssistant(){return `${headline('THE READING DESK','Meet your <em>book guide.</em>','Ask about stock, compare exam-preparation subjects, and explore fiction from the actual catalog.')}
  <div class="assistant-page-layout"><section class="assistant-main card"><div class="assistant-main-header"><div class="assistant-profile"><span class="assistant-glow">${ico('bot')}</span><div><strong>Ask Lumen</strong><small><span class="online-dot"></span> Catalog-aware book assistant</small></div></div><span class="chip green">${app.books.length} searchable titles</span></div><div class="chat-thread assistant-page-thread" id="assistantPageThread" role="log" aria-live="polite">${chatContent()}</div><div class="assistant-input-wrap"><form data-chat-form="page" class="chat-form page-chat-form"><input name="message" maxlength="240" aria-label="Message book assistant" placeholder="e.g. Which GATE CSE books are currently available?" autocomplete="off" required/><button type="submit" aria-label="Send message">${ico('arrow')}</button></form><p>Transparent catalog lookup, not a general-purpose AI. Live copy counts update after issues, returns and restocking.</p></div></section><aside class="assistant-side"><div class="assistant-side-hero"><span class="eyebrow">POPULAR QUESTIONS</span><h3>Find the right book for your next chapter.</h3><p>Use these suggestions to start a search; every recommendation links back to a catalog record.</p><div class="assistant-shortcuts">${quickPromptMarkup()}</div></div><div class="assistant-scope card"><span class="scope-icon">${ico('shield')}</span><h3>What this assistant knows</h3><p>Book IDs, titles, authors, shelf categories, current available copies and subject-aligned reading suggestions.</p><p>It cannot reserve books, check external databases, or promise an exam rank or outcome.</p></div></aside></div>`}
function renderAdmin(){
  const low=app.books.filter(b=>b.availableCopies<=1),total=app.books.reduce((x,b)=>x+b.totalCopies,0);
  return `${headline('OPERATIONS CENTER','Library <em>administration.</em>','A working local inventory desk: add books, edit information, add copies, and review circulation.',`<button class="btn btn-secondary" data-action="export-books">${ico('download')} Export records</button><button class="btn btn-primary" data-modal="add">${ico('plus')} Add book</button>`)}
  <div class="admin-intro"><div><span class="admin-badge">DEMO ADMIN WORKSPACE</span><h2>Everything on your shelves, in your hands.</h2><p>Manage inventory accurately. Updates are reflected in catalog search and the student assistant immediately.</p></div><div class="admin-intro-symbol">${ico('shield')}</div></div>
  <div class="admin-metrics">${stat('REGISTERED TITLES',app.books.length,'Across all genres','book','purple')}${stat('TOTAL INVENTORY',total,'Physical copies tracked','stack','blue')}${stat('ACTIVE LOANS',activeLoans().length,'Outstanding student issues','borrow','orange')}${stat('LOW STOCK',low.length,'Titles with 0 or 1 copy on shelf','info','green')}</div>
  <div class="admin-workspace card"><div class="admin-workspace-head"><div><h2>Inventory control</h2><p>Edits preserve original book IDs and existing loan records.</p></div><span class="chip purple">${app.books.length} TITLES</span></div><div class="admin-tools"><label class="searchbox">${ico('search')}<input id="adminSearch" value="${escapeHtml(app.adminQuery)}" placeholder="Search books or book IDs..." aria-label="Search admin inventory"/></label><select class="select-control" id="adminFilter" aria-label="Filter inventory"><option value="all" ${app.adminFilter==='all'?'selected':''}>All categories</option><option value="low" ${app.adminFilter==='low'?'selected':''}>Low stock</option><option value="zero" ${app.adminFilter==='zero'?'selected':''}>Out of stock</option></select></div><div id="adminInventory">${adminRows()}</div></div>
  <p class="admin-security-note">${ico('info')} Local assignment demo: this admin area is functional but is not password-protected. Do not publish this backend as a real institution service without authentication and role-based permissions.</p>`;
}
function adminRows(){
  const q=app.adminQuery.toLowerCase().trim();const items=app.books.filter(b=>(!q||[b.title,b.author,b.id,shelfFor(b)].some(v=>String(v).toLowerCase().includes(q)))&&(app.adminFilter==='all'||(app.adminFilter==='low'?b.availableCopies<=1:b.availableCopies===0)));
  const perPage=14, pages=Math.max(1,Math.ceil(items.length/perPage));app.adminPage=Math.min(Math.max(0,app.adminPage),pages-1);const offset=app.adminPage*perPage;const shown=items.slice(offset,offset+perPage);
  return `<div class="table-wrap"><table class="data-table admin-table"><thead><tr><th>BOOK / AUTHOR</th><th>CATEGORY</th><th>STOCK</th><th>MANAGE</th></tr></thead><tbody>${shown.map(b=>`<tr><td><div class="table-book">${cover(b,'table-cover')}<div><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.id)} · ${b.year}</small></div></div></td><td><span class="category-pill">${escapeHtml(shelfFor(b))}</span></td><td><span class="chip ${b.availableCopies===0?'red':b.availableCopies<=1?'amber':'green'}">${b.availableCopies} / ${b.totalCopies} copies</span></td><td><div class="admin-actions"><button class="btn btn-secondary btn-small" data-modal="edit" data-book="${escapeHtml(b.id)}">Edit</button><button class="btn btn-ghost btn-small" data-modal="restock" data-book="${escapeHtml(b.id)}">+ Copies</button></div></td></tr>`).join('')||`<tr><td colspan="4">No matching inventory records.</td></tr>`}</tbody></table></div><div class="admin-table-foot"><span>${items.length?`${offset+1}–${offset+shown.length}`:'0'} of ${items.length} matching titles</span><div class="admin-pagination"><button data-admin-turn="prev" type="button" ${app.adminPage===0?'disabled':''}>Previous</button><span>Page ${app.adminPage+1} / ${pages}</span><button data-admin-turn="next" type="button" ${app.adminPage>=pages-1?'disabled':''}>Next</button></div></div>`;
}
function renderAdminTable(){const node=$('#adminInventory');if(node)node.innerHTML=adminRows()}

document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-chat-toggle],[data-chat-prompt],[data-admin-turn]');if(!btn)return;
  if(btn.dataset.adminTurn){app.adminPage+=btn.dataset.adminTurn==='next'?1:-1;renderAdminTable();return}
  
if (btn.dataset.chatToggle) {
  if (btn.dataset.chatToggle === 'open') {
    app.chatHistory = [];
  }

  toggleChat(btn.dataset.chatToggle === 'open');
  return;
}

  if(btn.dataset.chatPrompt){sendChat(btn.dataset.chatPrompt);return}
});

document.addEventListener('click', event => {
  const assistantLink =
    event.target.closest('[data-page="assistant"]');

  if (assistantLink) {
    app.chatHistory = [];
  }
}, true);

document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-chat-form]');if(!form)return;
  event.preventDefault();const input=form.elements.namedItem('message');sendChat(input.value);input.value='';input.focus();
});
syncChatWidget();
