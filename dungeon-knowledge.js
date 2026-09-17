/* Persistent party knowledge is separate from the dungeon's physical state. */
const DungeonKnowledge = (() => {
  const defaults = {perception:10, autoThreshold:16, autoRange:2, inspectBonus:6};
  const hazardTypes = new Set(['pit','trap','teleporter','rotator']);
  const tileKey = (s,x=s.x,y=s.y) => `${s.floor}:${x},${y}`;
  const objectKey = (s,o) => `${s.floor}:${o.id || `${o.type}:${o.tile}`}`;
  const hazards = map => [...(map.hazards || []), ...(map.objects || []).filter(o=>hazardTypes.has(o.type))];
  const landmarks = map => (map.objects || []).filter(o=>o.landmark || ['entrance','stairs_down','stairs_up','fountain'].includes(o.type));
  const occupies = (o,x,y) => (o.interaction_tiles || (o.tile ? [o.tile] : [])).some(t=>t[0]===x && t[1]===y);
  const automaticDoor = d => !!d && ['standard_door','reinforced_door'].includes(d.type) && !d.locked && !d.sealed && !d.jammed && !d.broken && !d.scripted && !d.requiresInteraction;
  function normalize(s,map){
    s.visited ||= {};
    s.openedDoors ||= {};
    const legacy = !s.knowledge;
    s.knowledge ||= {};
    for(const k of ['hazards','landmarks','doors']) s.knowledge[k] ||= {};
    s.knowledge.version=1;
    s.lost = s.lost===true;
    for(const m of s.party) if(!Number.isFinite(m.perception)) m.perception=defaults.perception;
    // Old saves already earned these landmarks. Do not erase that history.
    for(const o of landmarks(map)) if((o.interaction_tiles || [o.tile]).filter(Boolean).some(t=>s.visited[tileKey(s,...t)])) s.knowledge.landmarks[objectKey(s,o)]=true;
    for(const d of map.doors || []){
      if(legacy && s.openedDoors[d.id]) s.knowledge.doors[objectKey(s,d)]=true;
      if(automaticDoor(d)) delete s.openedDoors[d.id];
    }
  }
  function explore(s,map){
    if(s.lost)return false;
    s.visited[tileKey(s)]=true;
    for(const o of landmarks(map)) if(occupies(o,s.x,s.y)) s.knowledge.landmarks[objectKey(s,o)]=true;
    for(const h of hazards(map)) if(occupies(h,s.x,s.y) && s.knowledge.hazards[objectKey(s,h)]) s.knowledge.hazards[objectKey(s,h)].mapped=true;
    return true;
  }
  function reveal(s,h,method,notify){
    const k=objectKey(s,h), known=s.knowledge.hazards[k];
    if(known){if(!s.lost)known.mapped=true;return false;}
    s.knowledge.hazards[k]={type:h.type,tile:[...h.tile],method,mapped:!s.lost};
    notify(`You discover a ${h.type}${method==='inspection' || method==='perception' ? ' ahead' : ''}.`);
    return true;
  }
  function detect(s,map,{manual=false,clear,notify}){
    const perception=Math.max(0,...s.party.filter(m=>m.hp>0).map(m=>m.perception));
    if(!s.party.some(m=>m.hp>0) || (!manual && perception<defaults.autoThreshold))return 0;
    const [dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][s.dir];
    let x=s.x,y=s.y,found=0;
    for(let step=1;step<=(manual ? 1 : defaults.autoRange);step++){
      const nx=x+dx,ny=y+dy;
      if(!clear(x,y,nx,ny))break;
      x=nx;y=ny;
      for(const h of hazards(map).filter(h=>occupies(h,x,y))){
        if(perception+(manual ? defaults.inspectBonus : 0)>=(h.detection ?? defaults.autoThreshold)){
          if(reveal(s,h,manual ? 'inspection' : 'perception',notify))found++;
        }
      }
    }
    return found;
  }
  function reorient(s,map,{ability=false,notify}={}){
    if(!s.lost)return false;
    const known=landmarks(map).find(o=>occupies(o,s.x,s.y) && s.knowledge.landmarks[objectKey(s,o)]);
    if(!ability && !known)return false;
    s.lost=false;
    explore(s,map);
    if(notify)notify(known ? 'You recognize a known landmark and regain your bearings.' : 'You regain your bearings.');
    return true;
  }
  function trigger(s,map,{notify,random=Math.random,relocate=()=>false}){
    for(const h of hazards(map).filter(h=>occupies(h,s.x,s.y))){
      // Record the source tile before a fall, teleport, or rotation changes navigation.
      reveal(s,h,'trigger',notify);
      if(h.type==='rotator'){
        s.dir=(s.dir+1+Math.floor(random()*3))%4;s.lost=true;
        notify('The revolving floor spins you around. You are Lost.');
      }else{
        if(h.damage>0){
          for(const m of s.party.filter(m=>m.hp>0))m.hp=Math.max(0,m.hp-h.damage);
          notify(`The ${h.type} triggers: each conscious party member takes ${h.damage} damage.`);
        }
        if(h.destination)relocate(h.destination,h);
      }
    }
  }
  return {defaults,tileKey,objectKey,hazards,occupies,automaticDoor,normalize,explore,reveal,detect,reorient,trigger};
})();
if(typeof module!=='undefined')module.exports=DungeonKnowledge;
