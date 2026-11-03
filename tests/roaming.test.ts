import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { Breaks, onBreakEligible, type BreakHost } from '../src/client/features/roaming/controller';
import { Court } from '../src/client/world/court';
import { planMap } from '../src/shared/maps';
import { NavGrid } from '../src/shared/nav';
import type { WorkerInfo } from '../src/shared/protocol';
import type { Worker } from '../src/client/world/character';
import type { DeskView } from '../src/client/world/types';
const worker = (overrides: Partial<WorkerInfo> = {}) => ({id:'test-worker',kind:'agent',status:'idle',acked:true,...overrides}) as WorkerInfo;
test('only idle agents and acknowledged completions can take a break',()=>{
 assert.ok(onBreakEligible(worker()));
 assert.ok(onBreakEligible(worker({status:'done',acked:true})));
 for(const status of ['starting','working','needs_input','offline','exited'] as const)assert.equal(onBreakEligible(worker({status})),false);
 assert.equal(onBreakEligible(worker({status:'done',acked:false})),false);
 assert.equal(onBreakEligible(worker({kind:'shell'})),false);
 assert.equal(onBreakEligible(worker({meeting:'meeting-1'})),false);
 assert.equal(onBreakEligible(worker({lost:true})),false);
});
test('breaks wait, stroll, rest briefly, and return; new work cancels the stroll',()=>{
 const b=new Breaks();let away=false,moving=false,roaming=false,visits=0,homes=0,cheers=0;
 const host:BreakHost={away:()=>away,travelling:()=>moving,roaming:()=>roaming,roam:()=>{visits++;away=true;moving=true;roaming=true;return true},home:()=>{if(roaming){homes++;roaming=false}},cheer:()=>{cheers++}};
 b.update(19,[worker()],host,[[0,0]]);assert.equal(visits,0);
 b.update(21,[worker()],host,[[0,0]]);assert.equal(visits,1);
 b.update(1,[worker()],host,[[0,0]]);assert.equal(cheers,0,'No celebration while walking');
 moving=false;b.update(.25,[worker()],host,[[0,0]]);assert.equal(cheers,1);
 b.update(11,[worker()],host,[[0,0]]);assert.equal(homes,1);
 away=false;b.update(.25,[worker()],host,[[0,0]]);b.update(60,[worker()],host,[[0,0]]);assert.equal(visits,2);
 b.update(.25,[worker({status:'working'})],host,[[0,0]]);assert.equal(homes,2,'Work calls the worker home');
 b.update(60,[worker({status:'needs_input'})],host,[[0,0]]);assert.equal(visits,2);
});
test('a roaming worker remains clickable, follows paths around walls, and returns to its anchor',()=>{
 const config=JSON.parse(readFileSync(new URL('../docs/maps/qs-four-rooms.json',import.meta.url),'utf8'));
 const plan=planMap(config),nav=new NavGrid(plan.bounds,plan.obstacles),parent=new THREE.Group();
 const def=plan.desks[0],anchor=new THREE.Group();anchor.position.set(def.x,1,def.z);anchor.rotation.y=def.rotY;parent.add(anchor);
 const model={root:new THREE.Group(),walking:false,gait:1,pace:1,stopDancing(){}} as unknown as Worker;anchor.add(model.root);
 const court=new Court(parent,plan,nav,()=>0,()=>{});
 court.add('a',model,{def,seatAnchor:anchor} as DeskView);
 assert.equal(court.roam('a',[-3,-15.75]),false,'Cannot roam into a partition');
 assert.ok(court.roam('a',[-14,21]));
 court.line([]);assert.ok(court.roaming('a'),'Unrelated worker updates do not cancel a break');
 let onFloor=false;
 for(let i=0;i<2500 && court.travelling('a');i++){
  court.update(.025);
  const clear=nav.walkable(model.root.position.x,model.root.position.z);
  if(onFloor)assert.ok(clear,'Must stay on clear floor after stepping off the bench');
  else if(clear)onFloor=true;
 }
 assert.ok(onFloor);
 assert.ok(court.away('a'));assert.equal(court.travelling('a'),false);
 const marker=court.interactables.find(i=>!i.off&&i.deskId===def.id);assert.ok(marker,'Walk up to or click the roaming worker');
 assert.ok(Math.abs(marker.x+14)<.1&&Math.abs(marker.z-21)<.1);
 court.home('a');for(let i=0;i<2500&&court.away('a');i++)court.update(.025);
 assert.equal(court.away('a'),false);assert.equal(model.root.parent,anchor);assert.ok(marker.off);
 court.release('a');assert.equal(court.interactables.length,plan.lineup.length);
});
