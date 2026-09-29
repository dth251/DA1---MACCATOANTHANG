// Run with: node tests/commerce.test.cjs
// DOM fixtures exercise page event handlers; browser layout/native validation need browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let passed = 0;
const checks = [];
function test(name, fn) { checks.push([name, fn]); }

function fixture(page, initial = {}, search = '') {
  const nodes = new Map(), documentEvents = {}, windowEvents = {};
  const state = {saved: JSON.stringify(initial), failStorage: false, downloads: [], submissions: [], failSend: false};
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: '', innerHTML: '', textContent: '', hidden: false, disabled: false, checked: true,
      dataset: {}, minLength: -1, listeners: {}, focused: false,
      classList: {add(){},remove(){},toggle(){}},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      focus() { this.focused = true; },
      reset() { for (const [key, item] of nodes) if (key.startsWith('field:' + selector + ':')) item.value = ''; },
      reportValidity() { return this.valid !== false; },
      elements: {namedItem(name) { return node('field:' + selector + ':' + name); }}
    });
    return nodes.get(selector);
  }
  node('[name="shipping"]:checked').value = 'standard';
  const document = {
    body: {dataset: {page}}, querySelector: node, querySelectorAll: () => [],
    addEventListener: (type, fn) => documentEvents[type] = fn
  };
  const window = {addEventListener: (type, fn) => windowEvents[type] = fn};
  const context = vm.createContext({document, window, location: {search},
    localStorage: {getItem: () => state.saved, setItem: (key, value) => {if (state.failStorage) throw Error('Blocked');state.saved=value;}},
    URLSearchParams, Intl, Date, Number, String, Object, JSON, Math,
    setTimeout: () => 1, clearTimeout() {},
    FormData: class {constructor(form){this.form=form;} get(name){return this.form.elements.namedItem(name).value;}},
  });
  vm.runInContext(read('store.js'), context);
  context.Macca = window.Macca;
  context.Macca.download = (name, text) => state.downloads.push({name,text});
  context.MaccaRequests = {sender: () => async (form, payload) => {
    if (state.failSend) throw new Error('Chưa lưu được yêu cầu. Vui lòng thử lại.');
    state.submissions.push(payload);
    const items = (payload.items || []).map(i => ({...window.Macca.products.find(p => p.id === i.id),quantity:i.quantity}));
    const shippingFee = payload.shipping === 'express' ? 45000 : 30000;
    return {id:'YC-TEST-REQUEST',createdAt:'2026-09-29T00:00:00Z',items,shippingFee,total:items.reduce((sum,p)=>sum+p.price*p.quantity,shippingFee)};
  }};
  vm.runInContext(read('journal-data.js'), context);
  vm.runInContext(read(page === 'journal' ? 'journal.js' : page === 'contact' ? 'contact.js' : ['home','catalog'].includes(page) ? 'app.js' : 'commerce.js'), context);
  const set = (form, data) => Object.entries(data).forEach(([name,value]) => node(form).elements.namedItem(name).value=value);
  const submit = form => node(form).listeners.submit({preventDefault(){}});
  const click = dataset => documentEvents.click({target:{closest:()=>({dataset})}});
  return {node,state,context,windowEvents,documentEvents,set,submit,click};
}

test('Malformed and unknown cart items never affect totals', async () => {
  const f=fixture('cart',{natural:2,kernel:-4,roasted:100,gift:'3',unknown:5});
  assert.equal(f.context.Macca.subtotal(f.context.Macca.read()),370000);
  assert.equal(f.node('#cart-count').textContent,2);
  assert.match(f.node('#basket-summary').innerHTML,/400\.000/);
});
test('Cart add, quantity edits and removal persist shared state', async () => {
  const f=fixture('cart');
  assert.equal(f.node('#cart-layout').hidden,true);
  f.click({add:'kernel'});
  assert.equal(JSON.parse(f.state.saved).kernel,1);
  f.click({step:'kernel',delta:'1'});
  assert.equal(JSON.parse(f.state.saved).kernel,2);
  const invalid={dataset:{quantity:'kernel'},value:'1.5'};
  f.documentEvents.change({target:invalid});
  assert.equal(JSON.parse(f.state.saved).kernel,2);
  f.documentEvents.change({target:{dataset:{quantity:'kernel'},value:'99'}});
  f.click({step:'kernel',delta:'1'});
  assert.equal(JSON.parse(f.state.saved).kernel,99);
  f.click({remove:'kernel'});
  assert.equal(f.node('#cart-empty').hidden,false);
});
test('Shipping selection recalculates checkout totals', async () => {
  const f=fixture('checkout',{natural:1});
  assert.match(f.node('#checkout-summary').innerHTML,/215\.000/);
  f.node('[name="shipping"]:checked').value='express';
  f.documentEvents.change({target:{dataset:{},name:'shipping'}});
  assert.match(f.node('#checkout-summary').innerHTML,/230\.000/);
});
test('Empty checkout blocks submission and shows recovery link', async () => {
  const f=fixture('checkout');
  assert.equal(f.node('#checkout-form').hidden,true);
  assert.equal(f.node('#place-order').disabled,true);
  await f.submit('#checkout-form');
  assert.equal(f.node('#order-receipt').textContent,'');
});
test('Checkout requires review after a stale-tab cart change', async () => {
  const f=fixture('checkout',{natural:1});
  f.state.saved=JSON.stringify({natural:2});
  await f.submit('#checkout-form');
  assert.match(f.node('#checkout-error').textContent,/Giỏ hàng vừa thay đổi/);
  assert.equal(f.node('#order-receipt').textContent,'');
  assert.match(f.node('#checkout-summary').innerHTML,/400\.000/);
});
const customer={name:'Nguyễn Văn An',phone:'0901234567',email:'',province:'Hà Nội',ward:'Phường mẫu',address:'12 Đường mẫu',payment:'cod',shipping:'standard',note:'<img src=x onerror=alert(1)>'};
test('Checkout rejects whitespace, native invalid forms and bad phone input', async () => {
  const f=fixture('checkout',{natural:1});
  f.set('#checkout-form',{...customer,name:'   '});
  await f.submit('#checkout-form');
  assert.match(f.node('#checkout-error').textContent,/khoảng trắng/);
  f.set('#checkout-form',{...customer,phone:'         '});
  await f.submit('#checkout-form');
  assert.match(f.node('#checkout-error').textContent,/điện thoại/);
  f.node('#checkout-form').valid=false;
  f.set('#checkout-form',customer);await f.submit('#checkout-form');
  assert.equal(f.node('#order-receipt').textContent,'');
});
test('Order summary is truthful, escapes customer content and preserves cart', async () => {
  const f=fixture('checkout',{natural:1,kernel:2});
  f.set('#checkout-form',customer); await f.submit('#checkout-form');
  assert.match(f.node('#order-receipt').textContent,/665\.000/);
  assert.match(f.node('#order-receipt').textContent,/Chưa thanh toán/);
  assert.match(f.node('#order-receipt').textContent,/<img/);
  assert.equal(f.node('#order-receipt').innerHTML,'');
  assert.equal(JSON.parse(f.state.saved).kernel,2);
  assert.equal(f.node('#checkout-form').hidden,true);
  f.node('#download-order').listeners.click();
  assert.equal(f.state.downloads.length,1);
  const receipt=f.node('#order-receipt').textContent;
  await f.submit('#checkout-form');assert.equal(f.node('#order-receipt').textContent,receipt);
});
test('Unavailable payment methods cannot generate a receipt', async () => {
  const f=fixture('checkout',{gift:1});
  f.set('#checkout-form',{...customer,payment:'online'});await f.submit('#checkout-form');
  assert.match(f.node('#checkout-error').textContent,/không khả dụng/);
  assert.equal(f.node('#order-receipt').textContent,'');
});
test('Consultation sends to admin and keeps PII out of browser storage', async () => {
  const f=fixture('consult',{natural:1});const before=f.state.saved;
  f.set('#consult-form',{name:'Nguyễn An',phone:'0901234567',topic:'gift',message:'Tôi muốn mua 50 hộp quà.',quantity:'50',budget:'Từ 5 đến 20 triệu đồng'});
  await f.submit('#consult-form');
  assert.match(f.node('#consult-receipt').textContent,/ĐÃ GỬI/);
  assert.match(f.node('#consult-receipt').textContent,/50 hộp quà/);
  assert.equal(f.node('#consult-layout').hidden,true);
  f.node('#download-consult').listeners.click();
  f.node('#edit-consult').listeners.click();
  assert.equal(f.node('#consult-layout').hidden,false);
  assert.equal(f.node('#consult-form').elements.namedItem('name').value,'');
  assert.equal(f.state.submissions[0].details.quantity,50);
  assert.equal(f.state.downloads.length,1);assert.equal(f.state.saved,before);
});
test('Cross-tab cart updates clear checkout acknowledgement', async () => {
  const f=fixture('checkout',{natural:1});f.state.saved='{}';
  f.windowEvents.storage({key:f.context.Macca.key});
  assert.equal(f.node('#checkout-form').hidden,true);
  assert.equal(f.node('[name="acknowledge"]').checked,false);
});
test('Storage failure displays an actionable warning', async () => {
  const f=fixture('cart');f.state.failStorage=true;f.click({add:'gift'});
  assert.equal(f.node('#storage-warning').hidden,false);
  assert.deepEqual(JSON.parse(f.state.saved),{});
});
test('Homepage loads shared products and refreshes cart after Back navigation', async () => {
  const f=fixture('home',{natural:1});
  assert.match(f.node('#product-grid').innerHTML,/Macca nguyên vỏ sấy mộc/);
  assert.equal(f.node('#cart-count').textContent,1);
  f.state.saved=JSON.stringify({kernel:3});
  f.windowEvents.pageshow();
  assert.equal(f.node('#cart-count').textContent,3);
  f.state.saved=JSON.stringify({gift:2});
  vm.runInContext("add('natural')",f.context);
  assert.equal(JSON.parse(f.state.saved).gift,2);
  assert.equal(JSON.parse(f.state.saved).natural,1);
});
test('Catalog supports categories, accent-free search, sorting and cart', async () => {
  const f=fixture('catalog');
  assert.ok(f.node('#product-count').textContent.includes('4 / 4'));
  vm.runInContext("setFilter('shell')",f.context);
  assert.ok(f.node('#product-count').textContent.includes('2 / 4'));
  assert.ok(!f.node('#product-grid').innerHTML.includes('data-detail="kernel"'));
  f.node('#sort').value='desc';f.node('#sort').listeners.change();
  const cards=f.node('#product-grid').innerHTML;
  assert.ok(cards.indexOf('data-detail="roasted"')<cards.indexOf('data-detail="natural"'));
  vm.runInContext("setFilter('all');query='NHAN';renderProducts()",f.context);
  assert.match(f.node('#product-grid').innerHTML,/Nhân macca nguyên vị/);
  assert.ok(f.node('#product-count').textContent.includes('1 / 4'));
  vm.runInContext("query='khongco';renderProducts()",f.context);
  assert.match(f.node('#product-grid').innerHTML,/Chưa tìm thấy/);
  vm.runInContext("add('gift')",f.context);
  assert.equal(JSON.parse(f.state.saved).gift,1);
});
test('Journal searches without accents, filters categories and recovers empty results', async () => {
  const f=fixture('journal');
  assert.ok(f.node('#journal-result').textContent.includes('3 / 3'));
  f.node('#journal-query').value='SUA CHUA';f.node('#journal-query').listeners.input();
  assert.ok(f.node('#journal-result').textContent.includes('1 / 3'));
  assert.match(f.node('#article-grid').innerHTML,/sua-chua-macca/);
  f.click({journalFilter:'gift'});
  assert.match(f.node('#article-grid').innerHTML,/Chưa tìm thấy/);
  f.node('#journal-query').value='';f.node('#journal-query').listeners.input();
  assert.match(f.node('#article-grid').innerHTML,/chon-qua-macca/);
});
test('Article URLs show full content and unknown slugs are handled safely', async () => {
  const f=fixture('journal',{},'?article=sua-chua-macca');
  assert.equal(f.node('#journal-list').hidden,true);
  assert.match(f.node('#journal-reading').innerHTML,/Bước 1/);
  const missing=fixture('journal',{},'?article=%3Cimg%20onerror=x%3E');
  assert.match(missing.node('#journal-reading').innerHTML,/Bài viết chưa có/);
  assert.ok(!missing.node('#journal-reading').innerHTML.includes('onerror'));
});
test('Contact validates content, sends to admin and displays a safe receipt', async () => {
  const f=fixture('contact',{kernel:2}), before=f.state.saved;
  f.set('#contact-form',{name:'  ',email:'an@example.com',topic:'general',message:'Tôi muốn biết thêm về sản phẩm.'});
  await f.submit('#contact-form');assert.match(f.node('#contact-error').textContent,/họ tên/);
  f.set('#contact-form',{name:'Nguyễn An',email:'an@example.com',phone:'abc',topic:'general',message:'Tôi muốn biết thêm về sản phẩm.'});
  await f.submit('#contact-form');assert.match(f.node('#contact-error').textContent,/điện thoại/);
  f.set('#contact-form',{phone:'0901234567',message:'Tôi muốn mua <img src=x onerror=alert(1)>'});
  await f.submit('#contact-form');
  assert.equal(f.node('#contact-layout').hidden,true);
  assert.match(f.node('#contact-receipt').textContent,/ĐÃ GỬI/);
  assert.match(f.node('#contact-receipt').textContent,/<img/);
  assert.equal(f.node('#contact-receipt').innerHTML,'');
  f.node('#download-contact').listeners.click();
  f.node('#edit-contact').listeners.click();assert.equal(f.node('#contact-layout').hidden,false);
  assert.equal(f.node('#contact-form').elements.namedItem('name').value,'');
  assert.equal(f.state.submissions[0].type,'contact');
  assert.equal(f.state.downloads.length,1);
  assert.equal(f.state.saved,before);
});
test('Forms preserve inputs and avoid success if the server rejects delivery', async () => {
  for (const [page, form, receipt, error, fields] of [
    ['checkout','#checkout-form','#order-receipt','#checkout-error',customer],
    ['consult','#consult-form','#consult-receipt','#consult-error',{name:'Nguyễn An',phone:'0901234567',topic:'gift',message:'Tôi muốn mua hộp quà tặng.'}],
    ['contact','#contact-form','#contact-receipt','#contact-error',{name:'Nguyễn An',email:'an@example.com',topic:'general',message:'Tôi muốn hỏi về sản phẩm.'}],
  ]) {
    const f=fixture(page,{natural:1}); f.state.failSend=true; f.set(form,fields);
    await f.submit(form);
    assert.equal(f.node(receipt).textContent,'');
    assert.match(f.node(error).textContent,/Chưa lưu/);
    assert.equal(f.node(form).elements.namedItem('name').value,fields.name);
    assert.equal(f.state.submissions.length,0);
    f.state.failSend=false; await f.submit(form);
    assert.equal(f.state.submissions.length,1);
  }
});

test('Page IDs, links, scripts and local assets resolve', async () => {
  for (const file of ['index.html','gio-hang.html','tu-van.html','thanh-toan.html','cau-chuyen.html','san-pham.html','goc-macca.html','lien-he.html']) {
    const html=read(file), ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,file+' duplicate ID');
    for (const [,href] of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
      if (/^(https?:|data:|tel:|mailto:)/.test(href)) continue;
      const [target,anchor]=href.split('#');const targetPath=target.split('?')[0] || file;
      assert.ok(fs.existsSync(path.join(root,targetPath)),file+': '+href);
      if(anchor) assert.ok(read(targetPath).includes(`id="${anchor}"`),file+': '+href);
    }
  }
  for (const file of ['app.js','store.js','commerce.js','story.js','journal-data.js','journal.js','contact.js']) new vm.Script(read(file),{filename:file});
});
const done = (async () => { for (const [name, fn] of checks) { await fn(); passed++; console.log('PASS', name); } console.log(`${passed} checks passed.`); return passed; })();
if (require.main === module) done.catch(error => { console.error(error); process.exitCode = 1; });
module.exports = done;
