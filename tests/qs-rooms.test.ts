import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planMap} from '../src/shared/maps/index.js';
import {NavGrid} from '../src/shared/nav.js';
const config=JSON.parse(readFileSync(new URL('../docs/maps/qs-four-rooms.json',import.meta.url),'utf8'));
test('QS rooms provide four tables per department with reachable seats and solid walls',()=>{
 const plan=planMap(config),nav=new NavGrid(plan.bounds,plan.obstacles);
 assert.equal(plan.tables.length,16);
 for(const name of ['Tendering & Estimating','Procurement & Subcontracting','Post-Contract & Valuations','Legal & Dispute Resolution'])assert.equal(config.tables.filter((t:any)=>t.name.startsWith(name)).length,4);
 for(const x of [-3,3])for(const z of [-11,11])assert.ok(nav.walkable(x,z),'Doorway must be open');
 for(const x of [-3,3])for(const z of [-15.75,15.75])assert.equal(nav.walkable(x,z),false,'Wall must be solid');
 for(const d of [...plan.desks,...plan.overflow]){
  const route=nav.wayFrom(d,[0,20]);assert.ok(route.length>1,`${d.id} needs a route`);
  for(let i=2;i<route.length;i++){
   const a=route[i-1],b=route[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.15);
   for(let j=0;j<=n;j++)assert.ok(nav.walkable(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n),`${d.id} crosses a partition`);
  }
 }
});
