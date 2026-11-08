/* LUMEN 2.0 — the same interface runs against a persistent Kotlin API or a
   browser-only demonstration. No third-party JavaScript libraries are needed. */
'use strict';
const app = { page:'overview', books:[], loans:[], query:'', shelf:'All books', availability:'all', sort:'title', historyFilter:'all', favorites:new Set(), mode:'loading', chatOpen:false, chatHistory:[], adminQuery:'', adminFilter:'all', adminPage:0 };
const LIBRARY_CATEGORIES=['Technology','Science & study','Fiction & fantasy','Competitive exams','Design','Personal growth','Other reads'];
const categoryOptions=selected=>LIBRARY_CATEGORIES.map(c=>`<option value="${c}" ${c===selected?'selected':''}>${c}</option>`).join('');
const DB_KEY='lumen-library-preview-v1', FAV_KEY='lumen-library-favorites-v2';
let localMode = location.protocol==='file:' || Boolean(window.LUMEN_OFFLINE_PREVIEW) || location.hostname.endsWith('github.io');
let volatileDb=null, toastTimer=null, focusReturn=null;
const $=sel=>document.querySelector(sel), $$=sel=>Array.from(document.querySelectorAll(sel));
const ico=name=>`<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palettes=[['#313f64','#f0d8ac','#edf2ff'],['#506d65','#d6e8cb','#e7f0e8'],['#784f60','#f6d8d2','#faeeee'],['#475e82','#e2e8f4','#eaf0f7'],['#a2724a','#fff0ce','#faf1e6'],['#575080','#e0dbff','#f2effa'],['#4e706a','#e1f1de','#ecf6ef'],['#3d3d57','#d1c5a4','#eceaf0']];
const paletteFor=id=>palettes[Array.from(String(id)).reduce((n,c)=>n+c.charCodeAt(0),0)%palettes.length];
const getJson=(k)=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const saveJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){/* private browser mode: current session still works */}};
const isActive=l=>l.returnedAt==null;
const activeLoans=()=>app.loans.filter(isActive);
const bookOf=id=>app.books.find(b=>b.id===id);
const dateFmt=(ms,short=false)=>new Date(ms).toLocaleDateString('en-IN',short?{day:'2-digit',month:'short'}:{day:'2-digit',month:'short',year:'numeric'});
const num=n=>Number(n).toLocaleString('en-IN');
const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'};
function seedData(){
  const now=Date.now();
  const books=LUMEN_CATALOG.map(b=>({id:b.id,title:b.title,author:b.author,year:b.year,totalCopies:b.totalCopies,availableCopies:b.totalCopies,category:b.category}));
  const loans=[
    {transactionId:1,bookId:'BK-102',studentId:'ST-208',issuedAt:now-86400000*3,returnedAt:null},
    {transactionId:2,bookId:'BK-104',studentId:'ST-131',issuedAt:now-86400000*2,returnedAt:null},
    {transactionId:3,bookId:'BK-101',studentId:'ST-204',issuedAt:now-86400000,returnedAt:null}
  ];
  for(const loan of loans){const b=books.find(x=>x.id===loan.bookId);if(b)b.availableCopies--}
  return {books,loans};
}
function db(){
  let stored=volatileDb||getJson(DB_KEY);
  if(!stored||!Array.isArray(stored.books)||!Array.isArray(stored.loans)){stored=seedData();saveDb(stored);return stored;}
  // One-way non-destructive catalog upgrade: preserve loans, custom books, and edited stock.
  const ids=new Set(stored.books.map(b=>b.id));let changed=false;
  for(const starter of LUMEN_CATALOG){
    if(!ids.has(starter.id)){
      stored.books.push({id:starter.id,title:starter.title,author:starter.author,year:starter.year,totalCopies:starter.totalCopies,availableCopies:starter.totalCopies,category:starter.category});changed=true;
    }else{
      const b=stored.books.find(x=>x.id===starter.id);
      if(!b.category){b.category=starter.category;changed=true}
    }
  }
  if(changed)saveDb(stored);
  return stored;
}
function saveDb(data){volatileDb=data;saveJson(DB_KEY,data)}
function localPost(endpoint,data){
  const store=db(),id=String(data.id||data.bookId||'').trim().toUpperCase(),student=String(data.studentId||'').trim().toUpperCase();
  const fail=message=>({success:false,message});let outcome;
  if(endpoint==='/api/add'){
    const title=String(data.title||'').trim(),author=String(data.author||'').trim();
    const year=Number(data.year),copies=Number(data.copies),category=String(data.category||'Other reads').trim();
    if(!/^[A-Z0-9_-]{1,20}$/.test(id))outcome=fail('Book ID must have 1–20 letters, digits, hyphens or underscores.');
    else if(store.books.some(b=>b.id===id))outcome=fail(`Book ID ${id} already exists.`);
    else if(title.length<2||title.length>120)outcome=fail('Title must contain 2–120 characters.');
    else if(author.length<2||author.length>80)outcome=fail('Author must contain 2–80 characters.');
    else if(!Number.isInteger(year)||year<1000||year>new Date().getFullYear())outcome=fail('Enter a valid publication year.');
    else if(!Number.isInteger(copies)||copies<0||copies>100000)outcome=fail('Available copies must be a whole number between 0 and 100,000.');
    else if(!LIBRARY_CATEGORIES.includes(category))outcome=fail('Choose a valid category.');
    else{store.books.push({id,title,author,year,totalCopies:copies,availableCopies:copies,category});outcome={success:true,message:`“${title}” was added successfully.`}}
  }else if(endpoint==='/api/edit'){
    const book=store.books.find(b=>b.id===id),title=String(data.title||'').trim(),author=String(data.author||'').trim(),year=Number(data.year),category=String(data.category||'').trim();
    if(!book)outcome=fail(`Book ${id} does not exist.`);
    else if(title.length<2||title.length>120)outcome=fail('Title must be 2–120 characters.');
    else if(author.length<2||author.length>80)outcome=fail('Author must be 2–80 characters.');
    else if(!Number.isInteger(year)||year<1000||year>new Date().getFullYear())outcome=fail('Enter a valid publication year.');
    else if(!LIBRARY_CATEGORIES.includes(category))outcome=fail('Choose a valid category.');
    else{Object.assign(book,{title,author,year,category});outcome={success:true,message:`Book ${id} details updated.`}}
  }else if(endpoint==='/api/restock'){
    const book=store.books.find(b=>b.id===id),quantity=Number(data.quantity);
    if(!book)outcome=fail(`Book ${id} does not exist.`);
    else if(!Number.isInteger(quantity)||quantity<1||quantity>1000||book.totalCopies+quantity>100000)outcome=fail('Add 1–1000 copies without exceeding 100,000 total.');
    else{book.totalCopies+=quantity;book.availableCopies+=quantity;outcome={success:true,message:`Added ${quantity} copies to ${book.title}.`}}
  }else if(endpoint==='/api/issue'){
    const book=store.books.find(b=>b.id===id);
    if(!book)outcome=fail(`Book ${id||'(blank)'} does not exist.`);
    else if(!/^[A-Z0-9_-]{2,24}$/.test(student))outcome=fail('Student ID must contain 2–24 letters, digits, hyphens or underscores.');
    else if(book.availableCopies<1)outcome=fail(`No copies of “${book.title}” are available.`);
    else if(store.loans.some(l=>l.bookId===id&&l.studentId===student&&isActive(l)))outcome=fail(`Student ${student} already holds this book.`);
    else{book.availableCopies--;store.loans.push({transactionId:Math.max(0,...store.loans.map(l=>l.transactionId))+1,bookId:id,studentId:student,issuedAt:Date.now(),returnedAt:null});outcome={success:true,message:`Book ${id} issued to ${student}.`}}
  }else if(endpoint==='/api/return'){
    const loan=[...store.loans].reverse().find(l=>l.bookId===id&&l.studentId===student&&isActive(l));
    if(!loan)outcome=fail(`No active issue found for book ${id||'(blank)'} and student ${student||'(blank)'}.`);
    else{const book=store.books.find(b=>b.id===id);if(!book)outcome=fail('The book no longer exists in the catalog.');else{loan.returnedAt=Date.now();book.availableCopies++;outcome={success:true,message:`Book ${id} returned by ${student}.`}}}
  }else outcome=fail('Unknown operation.');
  if(outcome.success)saveDb(store);return outcome;
}
async function api(endpoint,data){
  if(localMode)return data?localPost(endpoint,data):endpoint==='/api/books'?db().books:db().loans;
  const opt=data?{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(data)}:{};
  const response=await fetch(endpoint,opt);const parsed=await response.json();
  if(!response.ok&& !data)throw new Error(`Server responded ${response.status}`);
  return parsed;
}
async function loadData(){
  try{
    if(app.mode==='loading'&&!localMode){
      const probe=await fetch('/api/books');if(!probe.ok||!Array.isArray(await probe.json()))throw new Error('No Kotlin API at this address');
    }
  }catch(e){localMode=true;}
  try{
    const [books,loans]=await Promise.all([api('/api/books'),api('/api/loans')]);
    if(!Array.isArray(books)||!Array.isArray(loans))throw new Error('Invalid record response');
    app.books=books;app.loans=loans;app.mode=localMode?'browser':'kotlin';render();
  }catch(e){
    $('#content').innerHTML=`<div class="card card-pad"><h2>Could not open the library</h2><p>${escapeHtml(e.message)}</p><p>Start the Kotlin server with <code>web/start.bat</code>, or open <code>index.html</code> for a browser-only demonstration.</p><button class="btn btn-secondary" data-action="refresh">Try again</button></div>`;
    $('#modeLabel').textContent='Connection unavailable';
  }
}
function cover(b,size='large'){
  const [bg,ink]=paletteFor(b.id),displayTitle=escapeHtml(b.title);
  return `<div class="book-cover ${size}" aria-label="Cover for ${displayTitle}" style="--cover:${bg};--coverInk:${ink}"><span class="cover-top">LUMEN / ${escapeHtml(b.year)}</span><span class="cover-title">${displayTitle}</span><span class="cover-author">${escapeHtml(b.author)}</span></div>`;
}
function shelfFor(b){
  if(b.category && LIBRARY_CATEGORIES.includes(b.category))return b.category;
  const t=`${b.title} ${b.author}`.toLowerCase();
  if(/algorithm|code|programmer|programming|deep learning|machine learning|computer|data structures|software|javascript|python|network|artificial intelligence|database/.test(t))return 'Technology';
  if(/design|creative|typography|architecture|visual|art\b/.test(t))return 'Design';
  if(/atomic|habit|psychology|mindset|thinking|productivity|growth|leadership/.test(t))return 'Personal growth';
  if(/engineering|physics|chemistry|calculus|mathematics|mechanics|electronics|science/.test(t))return 'Science & study';
  return 'Other reads';
}
function filteredBooks(){
  const term=app.query.trim().toLowerCase();let list=app.books.filter(b=>
    (!term||[b.id,b.title,b.author,String(b.year)].some(s=>String(s).toLowerCase().includes(term)))&&
    (app.shelf==='All books'||(app.shelf==='Saved books'?app.favorites.has(b.id):shelfFor(b)===app.shelf))&&
    (app.availability==='all'||(app.availability==='available'?b.availableCopies>0:b.availableCopies===0)));
  return list.sort((a,b)=>app.sort==='newest'?b.year-a.year:app.sort==='availability'?b.availableCopies-a.availableCopies:a.title.localeCompare(b.title));
}
const labelFor=page=>({overview:'Overview',discover:'Discover books',catalog:'Book catalog',issue:'Issue a book',return:'Return a book',loans:'Active loans',history:'Transaction history',assistant:'Book assistant',admin:'Library Admin',guide:'Rules & guidance'}[page]||'Overview');
function updateFrame(){
  $$('#sidebar .nav-link').forEach(el=>el.classList.toggle('active',el.dataset.page===app.page));
  $('#crumb').textContent=labelFor(app.page);$('#navLoanCount').textContent=activeLoans().length;
  $('#headerDate').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  $('#copyrightYear').textContent=new Date().getFullYear();
  $('#modeLabel').textContent=app.mode==='kotlin'?'Kotlin-backed records':'Browser demo · records stored on this device';
}
function render(){updateFrame();const page={overview:renderOverview,discover:renderDiscover,catalog:renderCatalog,issue:renderIssue,return:renderReturn,loans:renderLoans,history:renderHistory,assistant:(typeof renderAssistant==='function'?renderAssistant:renderOverview),admin:(typeof renderAdmin==='function'?renderAdmin:renderOverview),guide:renderGuide}[app.page]||renderOverview;$('#content').innerHTML=page();if(typeof syncChatWidget==='function')syncChatWidget()}
function navigate(page,resetQuery=false){
  if(resetQuery){app.query='';app.shelf='All books';app.availability='all';}
  app.page=page;render();closeMobile();window.scrollTo({top:0,behavior:'instant'});
}
function headline(kicker,heading,subtitle,actions=''){
  return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1 class="heading">${heading}</h1><p class="lead">${subtitle}</p></div>${actions?`<div class="button-group">${actions}</div>`:''}</div>`;
}
function empty(title,desc,action='',extra=''){
  return `<div class="empty ${extra}"><span class="empty-glyph">${ico('book')}</span><h3>${title}</h3><p>${desc}</p>${action}</div>`;
}
function stat(label,value,sub,icon,color){return `<div class="metric"><div class="metric-top"><strong>${label}</strong><span class="metric-icon ${color}">${ico(icon)}</span></div><div class="metric-value">${num(value)}</div><div class="metric-sub">${sub}</div></div>`}
function miniBook(b){return `<button class="mini-book" data-modal="issue" data-book="${escapeHtml(b.id)}" ${b.availableCopies<1?'disabled':''}>${cover(b,'table-cover')}<div><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.author)}</small><span class="chip ${b.availableCopies>0?'green':'red'}">${b.availableCopies>0?`${b.availableCopies} available`:'Out of stock'}</span></div></button>`}
function activityList(max=4){
  const list=[...app.loans].flatMap(l=>[...([{id:`i${l.transactionId}`,loan:l,type:'issued',time:l.issuedAt}]),...(l.returnedAt?[{id:`r${l.transactionId}`,loan:l,type:'returned',time:l.returnedAt}]:[])]).sort((a,b)=>b.time-a.time).slice(0,max);
  if(!list.length)return empty('No circulation yet','Issue a book to start your transaction history.','','tight');
  return `<div class="activity-list">${list.map(x=>`<div class="activity-item"><span class="activity-bubble ${x.type==='returned'?'returned':''}">${ico(x.type==='returned'?'return':'borrow')}</span><div class="activity-text"><strong>${escapeHtml(bookOf(x.loan.bookId)?.title||x.loan.bookId)}</strong><small>${x.type==='returned'?'Returned by':'Issued to'} ${escapeHtml(x.loan.studentId)}</small></div><time title="${dateFmt(x.time)}">${dateFmt(x.time,true)}</time></div>`).join('')}</div>`;
}
function renderOverview(){
  const stock=app.books.reduce((s,b)=>s+b.availableCopies,0),total=app.books.reduce((s,b)=>s+b.totalCopies,0),featured=['BK-143','BK-103','BK-180'].map(bookOf).filter(Boolean);
  return `<div class="overview-head"><div><div class="hello-line"><span class="sun">☀</span>${greeting()}, librarian</div><h1 class="heading">Your library, <span style="color:#7961d5">at a glance.</span></h1><p class="lead">Everything you need to keep the shelves organized and the stories moving.</p></div><div class="button-group overview-actions"><button class="btn btn-secondary" data-action="refresh">${ico('refresh')} Refresh</button><button class="btn btn-primary" data-modal="add">${ico('plus')} Add new book</button></div></div>
  <div class="hero-layout"><section class="hero-main"><div class="hero-copy"><span class="hero-kicker">✳ &nbsp; THE READING ROOM</span><h2 class="hero-title">A world of books,<br><span>beautifully organized.</span></h2><p class="hero-description">Discover your collection, manage checkouts, and give every book its place.</p><button class="btn btn-white" data-page="discover">Explore the collection ${ico('arrow-up')}</button></div><div class="hero-books" aria-hidden="true"><div class="decor-book one"><b>THE<br>ART OF<br>READING</b><small>THE COLLECTION</small></div><div class="decor-book two"><b>EVERY<br>GOOD<br>IDEA</b><small>BEGINS HERE</small></div><div class="decor-book three"><b>MORE<br>THAN<br>WORDS</b><small>LUMEN EDITION</small></div></div></section>
  <aside class="note-panel"><div><span class="note-icon">${ico('spark')}</span><h3>Good books deserve a good system.</h3><p>One thoughtful workspace for the whole library journey, from first catalog entry to final return.</p></div><button class="btn-text" data-page="guide">How Lumen works ${ico('arrow')}</button></aside></div>
  <div class="metrics">${stat('BOOK TITLES',app.books.length,'Unique titles in the catalog','book','purple')}${stat('TOTAL COPIES',total,'Across the entire collection','stack','blue')}${stat('ON THE SHELF',stock,'Ready to borrow today','check','green')}${stat('BOOKS ON LOAN',activeLoans().length,'Currently with students','borrow','orange')}</div>
  <div class="overview-bottom"><section><div class="section-head"><div><h2 class="section-heading">A few from the shelves</h2><p class="section-intro">A quick look at your registered collection.</p></div><button class="btn-text" data-page="discover">Browse all ${ico('arrow')}</button></div><div class="mini-grid">${featured.length?featured.map(miniBook).join(''):empty('Your shelves are empty','Add your first book to begin.')}</div><div class="section-head" style="margin-top:31px"><div><h2 class="section-heading">Quick circulation</h2><p class="section-intro">The everyday actions, one click away.</p></div></div><div class="button-group"><button class="btn btn-primary" data-page="issue">${ico('borrow')} Issue a book</button><button class="btn btn-secondary" data-page="return">${ico('return')} Record a return</button><button class="btn btn-secondary" data-page="loans">${ico('stack')} View active loans</button></div></section>
  <section><div class="section-head"><div><h2 class="section-heading">Recent activity</h2><p class="section-intro">The latest movements in your library.</p></div><button class="btn-text" data-page="history">View all ${ico('arrow')}</button></div><div class="card card-pad">${activityList(4)}</div></section></div>`;
}
function bookCard(b){
  const saved=app.favorites.has(b.id),[,,stage]=paletteFor(b.id);
  return `<article class="book-card"><div class="book-visual" style="--stage:${stage}">${cover(b)}<button class="bookmark ${saved?'saved':''}" data-fav="${escapeHtml(b.id)}" aria-label="${saved?'Remove from':'Save to'} reading list" title="${saved?'Remove from':'Save to'} reading list">${ico('heart')}</button></div><div class="book-card-body"><span class="book-category">${shelfFor(b)}</span><h3>${escapeHtml(b.title)}</h3><p class="author">by ${escapeHtml(b.author)} · ${b.year}</p><div class="book-card-footer"><div class="stock"><span class="chip ${b.availableCopies>0?'green':'red'}">${b.availableCopies>0?'Available':'Unavailable'}</span><b>${b.availableCopies} of ${b.totalCopies} copies</b></div><button class="btn ${b.availableCopies>0?'btn-dark':'btn-secondary'}" data-modal="issue" data-book="${escapeHtml(b.id)}" ${b.availableCopies===0?'disabled':''}>Issue ${ico('arrow')}</button></div></div></article>`;
}
function discoverResults(){const books=filteredBooks();return `<div class="result-heading"><strong>On the shelves</strong><span id="resultsCount">Showing ${books.length} of ${app.books.length} titles</span></div><div class="book-grid" id="bookGrid">${books.length?books.map(bookCard).join(''):empty('No titles found','Try another search or clear your filters.',`<button class="btn btn-secondary" data-action="reset-filters">Clear filters</button>`,'wide')}</div>`}
function renderDiscover(){
  return `${headline('THE COLLECTION','Find your next <em>good read.</em>','Browse real library records, check availability, and issue a book in a few clicks.',`<button class="btn btn-primary" data-modal="add">${ico('plus')} Add a title</button>`)}
  <div class="discover-hero"><div class="hero-dots"></div><span class="discover-blooms" aria-hidden="true">✳</span><div class="discover-hero-copy"><p class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p><h2>Stories, ideas, and<br><i>everything in between.</i></h2><p>Every great discovery begins with a question. Search the shelves and see what catches your eye.</p></div></div>
  <div class="search-filters"><label class="searchbox">${ico('search')}<input id="librarySearch" type="search" value="${escapeHtml(app.query)}" placeholder="Search by title, author, book ID or year..." aria-label="Search books"/><kbd>/</kbd></label><div class="filter-actions"><select class="select-control" id="availabilityFilter" aria-label="Filter by availability"><option value="all" ${app.availability==='all'?'selected':''}>All availability</option><option value="available" ${app.availability==='available'?'selected':''}>Available only</option><option value="unavailable" ${app.availability==='unavailable'?'selected':''}>Unavailable only</option></select><select class="select-control" id="sortFilter" aria-label="Sort books"><option value="title" ${app.sort==='title'?'selected':''}>Sort: A to Z</option><option value="newest" ${app.sort==='newest'?'selected':''}>Newest first</option><option value="availability" ${app.sort==='availability'?'selected':''}>Most available</option></select></div></div>
  <div class="shelf-row">${['All books','Technology','Science & study','Fiction & fantasy','Competitive exams','Design','Personal growth','Other reads','Saved books'].map(x=>`<button class="filter-tab ${app.shelf===x?'active':''}" data-shelf="${x}">${x==='Saved books'?'♡ ':''}${x}</button>`).join('')}</div>
  <div id="resultsArea">${discoverResults()}</div>`;
}
function tableRows(books){return books.map(b=>`<tr><td><div class="table-book">${cover(b,'table-cover')}<div><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.author)}</small></div></div></td><td><span class="mono">${escapeHtml(b.id)}</span></td><td>${b.year}</td><td><span class="chip ${b.availableCopies>0?'green':'red'}">${b.availableCopies>0?'Available':'Unavailable'}</span></td><td><strong style="color:#424758">${b.availableCopies}</strong> / ${b.totalCopies}</td><td><button class="table-link" data-modal="issue" data-book="${escapeHtml(b.id)}" ${b.availableCopies<1?'disabled':''}>Issue ${ico('arrow')}</button></td></tr>`).join('')}
function catalogTable(){const books=filteredBooks();return books.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>BOOK / AUTHOR</th><th>BOOK ID</th><th>YEAR</th><th>STATUS</th><th>COPIES</th><th>ACTION</th></tr></thead><tbody>${tableRows(books)}</tbody></table></div>`:empty('Nothing matches your search','Try searching another title or removing the availability filter.',`<button class="btn btn-secondary" data-action="reset-filters">Reset filters</button>`,'tight')}
function renderCatalog(){
  return `${headline('COLLECTION MANAGEMENT','The book <em>catalog.</em>','Every book, author, publication year and available copy in one searchable place.',`<button class="btn btn-secondary" data-action="export-books">${ico('download')} Export CSV</button><button class="btn btn-primary" data-modal="add">${ico('plus')} Add book</button>`)}
  <div class="table-tool-row"><label class="searchbox">${ico('search')}<input id="librarySearch" type="search" value="${escapeHtml(app.query)}" placeholder="Search title, author or book ID..." aria-label="Filter catalog"/></label><select class="select-control" id="availabilityFilter" aria-label="Availability filter"><option value="all" ${app.availability==='all'?'selected':''}>All books</option><option value="available" ${app.availability==='available'?'selected':''}>In stock</option><option value="unavailable" ${app.availability==='unavailable'?'selected':''}>Out of stock</option></select></div>
  <div class="table-card"><div class="table-head"><div><h3>Registered titles</h3><p id="tableCount">${filteredBooks().length} of ${app.books.length} titles in your collection</p></div><span class="chip purple">${app.books.length} RECORDS</span></div><div id="tableArea">${catalogTable()}</div></div>`;
}
function loanRows(loans,history=false){return loans.map(l=>{const b=bookOf(l.bookId);return `<tr><td><div class="table-book">${b?cover(b,'table-cover'):''}<div><strong>${escapeHtml(b?.title||l.bookId)}</strong><small>${escapeHtml(b?.author||'Not found in catalog')}</small></div></div></td><td><span class="mono">${escapeHtml(l.bookId)}</span></td><td><span class="mono">${escapeHtml(l.studentId)}</span></td><td>${dateFmt(l.issuedAt)}</td>${history?`<td>${l.returnedAt?dateFmt(l.returnedAt):'—'}</td>`:''}<td><span class="chip ${l.returnedAt?'gray':'purple'}">${l.returnedAt?'Returned':'Issued'}</span></td>${!history?`<td><button class="table-link" data-modal="return" data-book="${escapeHtml(l.bookId)}" data-student="${escapeHtml(l.studentId)}">Return ${ico('return')}</button></td>`:''}</tr>`}).join('')}
function renderLoans(){const loans=activeLoans().sort((a,b)=>b.issuedAt-a.issuedAt);return `${headline('CIRCULATION RECORDS','Currently <em>on loan.</em>','See which books are borrowed, by whom, and when they were issued.',`<button class="btn btn-primary" data-page="issue">${ico('borrow')} New checkout</button>`)}<div class="table-card"><div class="table-head"><div><h3>Outstanding checkouts</h3><p>All books awaiting return to the library</p></div><span class="chip purple">${loans.length} ACTIVE</span></div>${loans.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>BOOK</th><th>BOOK ID</th><th>STUDENT ID</th><th>ISSUED ON</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${loanRows(loans)}</tbody></table></div>`:empty('Everything is back on the shelves','There are no outstanding book issues right now.',`<button class="btn btn-primary" data-page="issue">Issue a book</button>`,'tight')}</div>`}
function renderHistory(){const loans=[...app.loans].sort((a,b)=>b.issuedAt-a.issuedAt).filter(l=>app.historyFilter==='all'||(app.historyFilter==='active'?isActive(l):!isActive(l)));return `${headline('ACTIVITY RECORD','Transaction <em>history.</em>','An audit-friendly record of every checkout and completed return.',`<button class="btn btn-secondary" data-action="export-loans">${ico('download')} Export CSV</button>`)}<div class="table-card"><div class="table-head"><div><h3>Circulation log</h3><p>${loans.length} matching transactions · records retained after return</p></div><div class="history-tools"><select id="historyFilter" class="select-control" aria-label="History filter"><option value="all" ${app.historyFilter==='all'?'selected':''}>All transactions</option><option value="active" ${app.historyFilter==='active'?'selected':''}>Active loans</option><option value="returned" ${app.historyFilter==='returned'?'selected':''}>Returned</option></select></div></div>${loans.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>BOOK</th><th>BOOK ID</th><th>STUDENT ID</th><th>ISSUED</th><th>RETURNED</th><th>STATUS</th></tr></thead><tbody>${loanRows(loans,true)}</tbody></table></div>`:empty('Nothing to show yet','Your transactions will be recorded here as books are issued and returned.','','tight')}</div>`}
function selectorOptions(selected='',onlyAvailable=false){return `<option value="">Select a book...</option>${app.books.filter(b=>!onlyAvailable||b.availableCopies>0||b.id===selected).map(b=>`<option value="${escapeHtml(b.id)}" ${b.id===selected?'selected':''}>${escapeHtml(b.id)} — ${escapeHtml(b.title)} (${b.availableCopies} available)</option>`).join('')}`}
function issueFields(bookId=''){return `<div class="form-grid"><div class="field full"><label for="issueBookId">Select a book <span>*</span></label><select id="issueBookId" name="bookId" required>${selectorOptions(bookId,true)}</select></div><div class="field full"><label for="issueStudentId">Student ID <span>*</span></label><input id="issueStudentId" name="studentId" maxlength="24" pattern="[A-Za-z0-9_-]{2,24}" placeholder="e.g. ST-1034" required autocomplete="off"/></div></div><div id="issuePreview">${issuePreview(bookId)}</div>`}
function issuePreview(id){const b=bookOf(id);if(!b)return `<div class="preview-box"><h4>BOOK PREVIEW</h4><div class="muted tiny">Choose a title above to check the available stock.</div></div>`;return `<div class="preview-box"><h4>YOU'RE ABOUT TO ISSUE</h4><div class="preview-inline">${cover(b,'table-cover')}<div><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.author)} · ${b.availableCopies} of ${b.totalCopies} available</small><span class="chip ${b.availableCopies>0?'green':'red'}" style="margin-top:7px">${b.availableCopies>0?'Available to borrow':'No available copies'}</span></div></div></div>`}
function returnFields(bookId='',studentId=''){return `<div class="form-grid"><div class="field full"><label for="returnBookId">Book ID <span>*</span></label><input id="returnBookId" name="bookId" maxlength="20" value="${escapeHtml(bookId)}" placeholder="e.g. BK-101" required autocomplete="off"/></div><div class="field full"><label for="returnStudentId">Student ID <span>*</span></label><input id="returnStudentId" name="studentId" maxlength="24" value="${escapeHtml(studentId)}" placeholder="e.g. ST-1034" required autocomplete="off"/></div></div><div class="preview-box"><h4>RETURN VALIDATION</h4><p class="tiny muted" style="margin:0;line-height:1.8">The system verifies that this exact student has an outstanding loan for the selected book. A return without a matching issue is rejected.</p></div>`}
function renderIssue(){return `${headline('CIRCULATION DESK','Issue a <em>book.</em>','Record a student checkout and automatically update the available stock.')}
  <div class="form-layout"><section class="card form-card"><h3>New checkout</h3><p>Choose an available title, then enter the student ID to record a loan.</p><form data-submit="issue">${issueFields()}<div class="form-footer"><button type="reset" class="btn btn-secondary">Clear form</button><button type="submit" class="btn btn-primary">${ico('borrow')} Confirm issue</button></div></form></section><aside><div class="helper-card"><span class="helper-icon">${ico('shield')}</span><h3>Before you issue</h3><p>Lumen checks every request to keep records accurate.</p><ol><li>The book must exist in the catalog.</li><li>At least one copy must be available.</li><li>The same student cannot hold duplicate active copies.</li><li>Stock decreases automatically after a valid issue.</li></ol></div><div class="helper-card" style="margin-top:16px"><div class="panel-title-row"><h3>On loan right now</h3><span class="chip purple">${activeLoans().length} ACTIVE</span></div>${activeLoans().slice(-3).reverse().map(l=>`<div class="quick-loan"><span class="activity-bubble">${ico('borrow')}</span><div><strong>${escapeHtml(bookOf(l.bookId)?.title||l.bookId)}</strong><small>Student ${escapeHtml(l.studentId)}</small></div></div>`).join('')||'<p>No active loans yet.</p>'}</div></aside></div>`}
function renderReturn(){return `${headline('CIRCULATION DESK','Return a <em>book.</em>','Check a book back in and restore its available copy count.')}
  <div class="form-layout"><section class="card form-card"><h3>Check in a book</h3><p>Enter the book and student IDs exactly as recorded on the original issue.</p><form data-submit="return">${returnFields()}<div class="form-footer"><button type="reset" class="btn btn-secondary">Clear form</button><button type="submit" class="btn btn-primary">${ico('return')} Confirm return</button></div></form></section><aside><div class="helper-card"><div class="panel-title-row"><h3>Awaiting return</h3><span class="chip amber">${activeLoans().length} OPEN</span></div><p>Use a record below to fill in the return form automatically.</p>${activeLoans().slice().reverse().slice(0,5).map(l=>`<div class="quick-loan"><span class="activity-bubble returned">${ico('book')}</span><div><strong>${escapeHtml(bookOf(l.bookId)?.title||l.bookId)}</strong><small>${escapeHtml(l.studentId)} · ${escapeHtml(l.bookId)}</small></div><button class="btn-text" data-pick-return="${escapeHtml(l.bookId)}" data-student="${escapeHtml(l.studentId)}">Select</button></div>`).join('')||'<p>There are currently no active loans.</p>'}</div><div class="helper-card" style="background:#f0f8f3;margin-top:15px"><span class="helper-icon" style="background:#fff;color:#2e8b67">${ico('check')}</span><h3>Accurate by design.</h3><p style="margin-bottom:0">Each successful return updates the original loan record and increases available stock by one.</p></div></aside></div>`}
function renderGuide(){return `${headline('ABOUT THE WORKSPACE','Simple rules, <em>better records.</em>','The essentials of managing the collection accurately, and what this demonstration can (and cannot) do.')}
  <div class="guide-layout"><section class="card guide-card"><span>${ico('book')}</span><h3>01. Catalog rules</h3><p>Keep one reliable record for every unique book ID.</p><ul><li>Book IDs are unique, case-insensitive, and 1–20 valid characters.</li><li>Title and author are required.</li><li>Year must be a valid publication year.</li><li>Copies must be a non-negative whole number.</li></ul></section><section class="card guide-card"><span>${ico('borrow')}</span><h3>02. Borrow & return</h3><p>Each checkout is linked to a specific book and student.</p><ul><li>A copy can be issued only when stock is available.</li><li>Each successful issue subtracts one copy.</li><li>Duplicate outstanding loans to the same student are blocked.</li><li>Only a matching loan can be returned.</li></ul></section><section class="card guide-card"><span>${ico('shield')}</span><h3>03. Data & privacy</h3><p>This is a local educational project, not a hosted institutional service.</p><ul><li>Browser demo stores records on this device only.</li><li>Kotlin server saves local records to a persistent file.</li><li>Different devices do not automatically synchronize.</li><li>Use CSV export to back up catalog and loan data.</li></ul></section></div>
  <div class="guide-banner"><div><h3>Built for the seven assignment tasks.</h3><p>Add books, display the catalog, search by ID/title, issue, return, view active loans, and use Kotlin's <code>when</code>-driven console menu. The reading discovery screen and transaction history are helpful extras, not replacements.</p></div><button class="btn btn-white" data-page="catalog">Open catalog ${ico('arrow')}</button></div>`}
function renderResultsOnly(){if(app.page==='discover'){const area=$('#resultsArea');if(area)area.innerHTML=discoverResults();}else if(app.page==='catalog'){const area=$('#tableArea');if(area)area.innerHTML=catalogTable();if($('#tableCount'))$('#tableCount').textContent=`${filteredBooks().length} of ${app.books.length} titles in your collection`}}
function showToast(message,error=false){const t=$('#toast');t.textContent=message;t.className='toast show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='toast',4000)}
function openModal(type,bookId='',studentId=''){
  focusReturn=document.activeElement;
  let title='',intro='',body='',submitLabel='';
  if(type==='add'){
    title='Add a new book';intro='A new chapter for your collection. Fill in the required details.';submitLabel='Add to catalog';
    body=`<div class="form-grid"><div class="field"><label for="newId">Book ID *</label><input id="newId" name="id" placeholder="BK-201" maxlength="20" required/></div><div class="field"><label for="newYear">Publication year *</label><input type="number" id="newYear" name="year" min="1000" max="${new Date().getFullYear()}" value="${new Date().getFullYear()}" required/></div><div class="field full"><label for="newTitle">Book title *</label><input id="newTitle" name="title" placeholder="Enter the book title" maxlength="120" required/></div><div class="field full"><label for="newAuthor">Author name *</label><input id="newAuthor" name="author" placeholder="Enter the author's name" maxlength="80" required/></div><div class="field full"><label for="newCopies">Number of available copies *</label><input id="newCopies" name="copies" type="number" min="0" max="100000" value="1" required/></div><div class="field full"><label for="newCategory">Shelf category</label><select id="newCategory" name="category">${categoryOptions("Other reads")}</select></div></div>`;
  }else if(type==='edit'){
    const b=bookOf(bookId);if(!b)return showToast('Book was not found.',true);
    title='Edit book details';intro=`Update ${escapeHtml(b.id)} without changing the loan history or book ID.`;submitLabel='Save changes';
    body=`<div class="form-grid"><div class="field full"><label>Book ID (locked)</label><input name="id" value="${escapeHtml(b.id)}" readonly/></div><div class="field full"><label for="editTitle">Book title *</label><input id="editTitle" name="title" maxlength="120" required value="${escapeHtml(b.title)}"/></div><div class="field full"><label for="editAuthor">Author *</label><input id="editAuthor" name="author" maxlength="80" required value="${escapeHtml(b.author)}"/></div><div class="field"><label for="editYear">Year *</label><input id="editYear" name="year" type="number" min="1000" max="${new Date().getFullYear()}" value="${b.year}" required/></div><div class="field"><label for="editCategory">Category</label><select id="editCategory" name="category">${categoryOptions(shelfFor(b))}</select></div></div>`;
  }else if(type==='restock'){
    const b=bookOf(bookId);if(!b)return showToast('Book was not found.',true);
    title='Add library copies';intro=`Restock ${escapeHtml(b.title)}. Current shelf count: ${b.availableCopies} copies.`;submitLabel='Add copies';
    body=`<div class="form-grid"><div class="field full"><label>Book ID</label><input name="bookId" value="${escapeHtml(b.id)}" readonly/></div><div class="field full"><label for="stockQuantity">Additional copies *</label><input id="stockQuantity" name="quantity" type="number" min="1" max="1000" value="3" required/></div></div><div class="preview-box"><h4>INVENTORY CHANGE</h4><p class="tiny muted">Copies added will increase both total inventory and available stock. Existing loans are unchanged.</p></div>`;
  }else if(type==='issue'){
    title='Issue a book';intro='Confirm the title and student ID to check out a copy.';submitLabel='Confirm issue';body=issueFields(bookId);
  }else if(type==='return'){
    title='Return a book';intro='A valid check-in needs a matching outstanding issue.';submitLabel='Confirm return';body=returnFields(bookId,studentId);
  }else return;
  $('#modalContent').innerHTML=`<div class="modal-head"><div><h2 id="modalHeading">${title}</h2><p>${intro}</p></div><button class="modal-close" data-close="true" aria-label="Close dialog">${ico('close')}</button></div><div class="modal-body"><form data-submit="${type}">${body}<div class="form-footer"><button type="button" class="btn btn-secondary" data-close="true">Cancel</button><button type="submit" class="btn btn-primary">${ico(type==='add'?'plus':type==='edit'?'check':type==='restock'?'stack':type==='issue'?'borrow':'return')} ${submitLabel}</button></div></form></div>`;
  $('#modalLayer').hidden=false;document.body.style.overflow='hidden';$('#modalContent input:not([type="hidden"]),#modalContent select')?.focus();
}
function closeModal(){if($('#modalLayer').hidden)return;$('#modalLayer').hidden=true;document.body.style.overflow='';$('#modalContent').innerHTML='';focusReturn?.focus?.()}
function closeMobile(){$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('visible')}
async function doSubmit(form){const kind=form.dataset.submit,data=Object.fromEntries(new FormData(form).entries()),btn=form.querySelector('[type="submit"]');btn.disabled=true;
  try{const outcome=await api('/api/'+kind,data);if(!outcome?.success){showToast(outcome?.message||'Request could not be completed.',true);return}
    showToast(outcome.message);closeModal();if(kind==='add'&&app.page!=='admin'){app.page='catalog';app.query='';app.shelf='All books';app.availability='all';}
    await loadData();
  }catch(e){showToast(`Could not save changes: ${e.message}`,true)}finally{btn.disabled=false}
}
function csvEscape(text){let str=String(text??'');if(/^[=+\-@\t\r]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"'}
function saveCsv(filename,rows){const csv='\uFEFF'+rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');const a=document.createElement('a');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showToast('CSV downloaded successfully.')}
function exportBooks(){saveCsv('lumen-book-catalog.csv',[['Book ID','Title','Author','Publication year','Total copies','Available copies'],...app.books.map(b=>[b.id,b.title,b.author,b.year,b.totalCopies,b.availableCopies])])}
function exportLoans(){saveCsv('lumen-circulation-history.csv',[['Transaction ID','Book ID','Book title','Student ID','Issued on','Returned on','Status'],...app.loans.map(l=>[l.transactionId,l.bookId,bookOf(l.bookId)?.title||'',l.studentId,new Date(l.issuedAt).toISOString(),l.returnedAt?new Date(l.returnedAt).toISOString():'',isActive(l)?'Issued':'Returned'])])}
function focusSearch(){navigate('discover');$('#librarySearch')?.focus()}

document.addEventListener('click',event=>{
  const el=event.target.closest('button,a');if(!el)return;
  if(el.dataset.close){closeModal();return}
  if(el.dataset.page){event.preventDefault();navigate(el.dataset.page);return}
  if(el.dataset.modal){openModal(el.dataset.modal,el.dataset.book||'',el.dataset.student||'');return}
  if(el.dataset.shelf){app.shelf=el.dataset.shelf;$$('.filter-tab').forEach(b=>b.classList.toggle('active',b===el));renderResultsOnly();return}
  if(el.dataset.showBook){app.query=bookOf(el.dataset.showBook)?.title||el.dataset.showBook;app.shelf='All books';app.availability='all';navigate('discover');return}
  if(el.dataset.fav){const id=el.dataset.fav;if(app.favorites.has(id))app.favorites.delete(id);else app.favorites.add(id);saveJson(FAV_KEY,[...app.favorites]);renderResultsOnly();return}
  if(el.dataset.pickReturn){$('#returnBookId').value=el.dataset.pickReturn;$('#returnStudentId').value=el.dataset.student||'';$('#returnStudentId').focus();return}
  if(el.dataset.action){switch(el.dataset.action){case 'refresh':loadData().then(()=>showToast('Library records refreshed.'));break;case 'reset-filters':app.query='';app.shelf='All books';app.availability='all';render();break;case 'export-books':exportBooks();break;case 'export-loans':exportLoans();break;}return}
});
document.addEventListener('input',event=>{if(event.target.id==='librarySearch'){app.query=event.target.value;renderResultsOnly()}if(event.target.id==='adminSearch'){app.adminQuery=event.target.value;app.adminPage=0;renderAdminTable()}});
document.addEventListener('change',event=>{
  if(event.target.id==='adminFilter'){app.adminFilter=event.target.value;app.adminPage=0;renderAdminTable()}
  if(event.target.id==='availabilityFilter'){app.availability=event.target.value;renderResultsOnly()}
  if(event.target.id==='sortFilter'){app.sort=event.target.value;renderResultsOnly()}
  if(event.target.id==='historyFilter'){app.historyFilter=event.target.value;render()}
  if(event.target.id==='issueBookId'){$('#issuePreview').innerHTML=issuePreview(event.target.value)}
});
document.addEventListener('submit',e=>{const form=e.target.closest('form[data-submit]');if(!form)return;e.preventDefault();doSubmit(form)});
document.addEventListener('reset',e=>{if(e.target.matches('form[data-submit]'))setTimeout(()=>{if($('#issuePreview'))$('#issuePreview').innerHTML=issuePreview('')},0)});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();focusSearch()}
  if(e.key==='/'&&!(e.target.matches('input, textarea,select'))&&!$('#modalLayer').hidden){return}
  if(e.key==='/'&&!(e.target.matches('input, textarea,select'))){e.preventDefault();focusSearch()}
  if(e.key==='Escape'){closeModal();closeMobile();if(app.chatOpen&&typeof toggleChat==='function')toggleChat(false)}
  if(e.key==='Tab'&&!$('#modalLayer').hidden){const focusable=$$('#modalLayer button:not([disabled]),#modalLayer input:not([disabled]),#modalLayer select:not([disabled])');const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
});
$('#globalSearchButton').addEventListener('click',focusSearch);
$('#mobileMenu').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#mobileOverlay').classList.add('visible')});
$('#mobileOverlay').addEventListener('click',closeMobile);
app.favorites=new Set(getJson(FAV_KEY)||[]);
loadData();
