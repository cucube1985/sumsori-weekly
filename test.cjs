const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/dist/index.html', 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx = {Intl, Date, URL, URLSearchParams, console, setTimeout, clearTimeout, AbortController};
vm.createContext(ctx);
vm.runInContext(source + '\nthis.app=Allergy;', ctx);
const app = ctx.app;
let passed = 0;
function test(name, fn) {fn(); console.log('PASS ' + name); passed++;}
const weather = {daily:{time:app.dates('2026-10-22'),temperature_2m_max:[22,22,22,22,22,22,22],temperature_2m_min:[10,10,10,10,10,10,10],relative_humidity_2m_mean:[50,50,50,50,50,50,50],precipitation_sum:[0,0,0,0,0,0,0],wind_speed_10m_max:[10,10,10,10,10,10,10]}};
test('7 Seoul-time dates cross month and year boundaries',()=>{assert.equal(app.dates('2026-12-29').join(','),'2026-12-29,2026-12-30,2026-12-31,2027-01-01,2027-01-02,2027-01-03,2027-01-04')});
test('all Seoul districts and 31 Gyeonggi cities/counties covered by five groups',()=>{assert.equal(app.regions.filter(x=>x.group==='seoul').length,25);assert.equal(app.regions.filter(x=>x.group==='gyeonggi').length,5);assert.equal(new Set(app.regions.map(x=>x.id)).size,30)});
test('7-day outlook uses weather and has finite bounded levels',()=>{const ds=app.makeDays(weather,null,'2026-10-22');assert.equal(ds.length,7);assert.ok(ds.every(d=>d.w&&d.level>=1&&d.level<=4&&d.pm===null));assert.ok(ds[0].p[2]>app.pollen('2026-10-22',null)[2])});
test('rain changes seasonal pollen heuristic without inventing concentration',()=>{assert.ok(app.pollen('2026-09-10',{max:23,wind:12,rain:0})[2]>app.pollen('2026-09-10',{max:23,wind:12,rain:12})[2])});
test('missing daily weather stays null; seasonal outlook survives failure',()=>{assert.equal(app.weatherAt(null,'2026-10-22'),null);const bad=JSON.parse(JSON.stringify(weather));bad.daily.temperature_2m_max[0]=null;assert.equal(app.weatherAt(bad,'2026-10-22'),null);assert.ok(app.makeDays(null,null,'2026-10-22').every(d=>d.w===null&&d.pm===null))});
test('PM needs complete 24 hours, preserves zero and missing future days',()=>{const h={hourly:{time:Array.from({length:24},(_,i)=>'2026-10-22T'+String(i).padStart(2,'0')+':00'),pm2_5:Array(24).fill(0)}};assert.equal(app.airAt(h,'2026-10-22'),0);assert.equal(app.airAt(h,'2026-10-23'),null);h.hourly.pm2_5[1]=null;assert.equal(app.airAt(h,'2026-10-22'),null)});
test('indoor empty input is not treated as a default moderate risk',()=>{const r=app.indoorRisk({});assert.equal(r.mite.status,'자료 없음');assert.equal(r.mite.level,0);assert.equal(r.mold.level,0)});
test('indoor humidity and leak produce different risk outcomes',()=>{const dry=app.indoorRisk({inHumidity:'40',inTemp:'18',washDays:'5'}),wet=app.indoorRisk({inHumidity:'75',inTemp:'24',washDays:'30',leak:true});assert.ok(wet.mite.level>dry.mite.level);assert.equal(wet.mold.level,4)});
test('direct mite report overrides heuristic, unclassified result stays unclassified',()=>{const r=app.indoorRisk({inHumidity:'90',inTemp:'24',washDays:'30',miteResult:'low',miteDate:'2026-10-01'});assert.equal(r.mite.level,1);assert.equal(r.mite.status,'직접 측정');assert.equal(app.indoorRisk({miteResult:'negative'}).mite.level,0)});
test('CFU zero is a lab value, numeric value never implies risk level',()=>{const r=app.indoorRisk({cfu:'0',moldDate:'2026-10-01',moldPlace:'침실',agency:'기관'});assert.equal(r.mold.status,'전문기관 검사');assert.equal(r.mold.level,0);assert.ok(r.mold.text.includes('0 CFU/㎥'))});
test('lab result requires context and nonfuture date',()=>{assert.ok(app.validate({cfu:'12',moldDate:'2099-01-01',moldPlace:'침실',agency:'기관'}));assert.ok(app.validate({cfu:'12',moldDate:'2026-10-01'}));assert.ok(app.validate({cfu:'',moldResult:'high'}));assert.equal(app.validate({cfu:'0',moldDate:'2026-10-01',moldPlace:'침실',agency:'기관'}),'')});
test('HTML IDs are unique and label targets exist',()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);for(const [,id] of html.matchAll(/\bfor="([^"]+)"/g))assert.ok(ids.includes(id))});
async function live(){for(const [name,lat,lon] of [['서울 종로구',37.573,126.979],['경기 동부',37.491,127.488]]){const q=`latitude=${lat}&longitude=${lon}&timezone=Asia%2FSeoul`;const w=await fetch('https://api.open-meteo.com/v1/forecast?'+q+'&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max&forecast_days=7').then(r=>{assert.equal(r.ok,true);return r.json()});const a=await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?'+q+'&hourly=pm2_5&forecast_days=5').then(r=>{assert.equal(r.ok,true);return r.json()});const start=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());const ds=app.makeDays(w,a,start);assert.equal(ds.length,7);assert.ok(ds.every(d=>d.w&&Number.isFinite(d.level)));assert.equal(ds[6].pm,null);console.log(`LIVE PASS ${name}: ${ds[0].date} ~ ${ds[6].date}, weather ${ds.filter(x=>x.w).length} days, PM ${ds.filter(x=>x.pm!==null).length} days`)} }
console.log(`${passed} checks passed; JavaScript parsed successfully.`);
if(process.argv.includes('--live'))live().catch(e=>{console.error(e);process.exitCode=1});
