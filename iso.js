// ===== Seeded RNG =====
function makeRng(seed=12345){
  let s = seed|0;
  return function(){ s = (s*1664525 + 1013904223)|0; return ((s>>>0)/4294967296); }
}

// ===== Simplex-like noise (very rough, enough for terrain blobs) =====
function noise2D(rng){
  const g = Array.from({length:256}, ()=>rng()*2-1);
  return (x,y)=>{
    const xi = (x|0)&255, yi = (y|0)&255;
    const a = g[(xi+yi)&255], b = g[(xi+yi+1)&255];
    const t = (x*0.13 + y*0.17);
    const s = (Math.sin(t)+1)/2;
    return a*(1-s) + b*s; // 0..~1 blend
  };
}

// ===== Iso helpers =====
const TILE_W = 64, TILE_H = 32; // diamond tile
function isoToScreen(ix, iy, iz=0){
  // classic 2:1 iso
  const sx = (ix - iy) * (TILE_W/2);
  const sy = (ix + iy) * (TILE_H/2) - iz;
  return {x:sx, y:sy};
}

// draw diamond tile at iso (ix,iy) with color
function drawTile(ctx, ix, iy, color, ox, oy){
  const {x,y} = isoToScreen(ix,iy);
  ctx.save();
  ctx.translate(ox + x, oy + y);
  ctx.beginPath();
  ctx.moveTo(0, TILE_H/2);
  ctx.lineTo(TILE_W/2, 0);
  ctx.lineTo(TILE_W, TILE_H/2);
  ctx.lineTo(TILE_W/2, TILE_H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// simple elevated block (1 cube height = 16px)
function drawBlock(ctx, ix, iy, h, baseColor, ox, oy){
  const {x,y} = isoToScreen(ix,iy);
  const topZ = h*16;

  // top
  ctx.save();
  ctx.translate(ox + x, oy + y - topZ);
  ctx.beginPath();
  ctx.moveTo(0, TILE_H/2);
  ctx.lineTo(TILE_W/2, 0);
  ctx.lineTo(TILE_W, TILE_H/2);
  ctx.lineTo(TILE_W/2, TILE_H);
  ctx.closePath();
  ctx.fillStyle = shade(baseColor, 1.0);
  ctx.fill();

  // right side
  ctx.beginPath();
  ctx.moveTo(TILE_W, TILE_H/2);
  ctx.lineTo(TILE_W, TILE_H/2 + topZ);
  ctx.lineTo(TILE_W/2, TILE_H + topZ);
  ctx.lineTo(TILE_W/2, TILE_H);
  ctx.closePath();
  ctx.fillStyle = shade(baseColor, 0.7);
  ctx.fill();

  // left side
  ctx.beginPath();
  ctx.moveTo(0, TILE_H/2);
  ctx.lineTo(TILE_W/2, TILE_H);
  ctx.lineTo(TILE_W/2, TILE_H + topZ);
  ctx.lineTo(0, TILE_H/2 + topZ);
  ctx.closePath();
  ctx.fillStyle = shade(baseColor, 0.82);
  ctx.fill();

  ctx.restore();
}

function shade(hex, k){
  // hex "#rrggbb"
  const n = (c)=>Math.max(0, Math.min(255, Math.round(c*k)));
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${n(r)},${n(g)},${n(b)})`;
}

// very simple dude (top-down-ish iso), 20×28 px
function drawDude(ctx, ix, iy, ox, oy, hue=30){
  const {x,y} = isoToScreen(ix,iy);
  ctx.save();
  ctx.translate(ox + x + TILE_W/2 - 10, oy + y - 20); // center-ish
  // legs
  ctx.fillStyle = `hsl(${hue} 30% 18%)`;
  ctx.fillRect(6,20,4,8); ctx.fillRect(10,20,4,8);
  // torso
  ctx.fillStyle = `hsl(${hue} 45% 32%)`;
  ctx.fillRect(4,10,12,12);
  // arms
  ctx.fillStyle = `hsl(${hue} 35% 28%)`;
  ctx.fillRect(2,12,4,10); ctx.fillRect(16,12,4,10);
  // head
  ctx.fillStyle = 'hsl(30 30% 70%)';
  ctx.fillRect(6,4,8,8);
  // cap/helmet
  ctx.fillStyle = `hsl(${hue} 60% 24%)`;
  ctx.fillRect(5,3,10,4);
  // backpack
  ctx.fillStyle = `hsl(${hue} 30% 22%)`;
  ctx.fillRect(2,14,3,8);
  ctx.restore();
}

// ===== World render =====
function render(){
  const canvas = document.getElementById('iso');
  const ctx = canvas.getContext('2d');
  const W = parseInt(document.getElementById('w').value,10) || 12;
  const H = parseInt(document.getElementById('h').value,10) || 10;
  const seed = parseInt(document.getElementById('seed').value,10) || 12345;
  const rng = makeRng(seed);
  const n2 = noise2D(rng);

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // iso origin (центрируем по горизонтали)
  const ox = canvas.width/2;
  const oy = 80;

  // terrain palette
  const water = "#1c3559", grass="#183823", dirt="#3a2e22", rubble="#3b3f46";
  // level map
  const heights = [];
  for(let y=0;y<H;y++){
    const row=[];
    for(let x=0;x<W;x++){
      const v = n2(x*0.9,y*0.9); // -1..1 примерно
      const h = v > 0.55 ? 2 : v > 0.2 ? 1 : 0; // 0..2 ступени
      row.push(h);
    }
    heights.push(row);
  }

  // base tiles (draw from back to front for correct overlap)
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      // pick base color
      const v = n2((x+10)*0.8,(y-7)*0.8);
      const color = v < -0.2 ? water : v < 0.25 ? grass : v < 0.5 ? dirt : rubble;

      const h = heights[y][x];
      if (h>0) drawBlock(ctx, x, y, h, color, ox, oy);
      else drawTile(ctx, x, y, color, ox, oy);
    }
  }

  // sprinkle a few buildings (3–6)
  const buildingColors = ["#6b7b8c","#7f6a58","#5d6d5f"];
  const count = 3 + Math.floor(rng()*4);
  for(let i=0;i<count;i++){
    const bx = Math.floor(rng()*W), by = Math.floor(rng()*H);
    const bh = 1 + Math.floor(rng()*3);
    drawBlock(ctx, bx, by, heights[by][bx] + bh, buildingColors[i%buildingColors.length], ox, oy);
  }

  // dudes (2–4)
  const dudes = 2 + Math.floor(rng()*3);
  for(let i=0;i<dudes;i++){
    const dx = Math.floor(rng()*W), dy = Math.floor(rng()*H);
    drawDude(ctx, dx, dy, ox, oy, 10 + Math.floor(rng()*240));
  }
}

// controls
document.getElementById('regen').addEventListener('click', ()=>{
  const s = document.getElementById('seed');
  s.value = (parseInt(s.value,10)||0) + 1;
  render();
});
['w','h','seed'].forEach(id=>document.getElementById(id).addEventListener('change', render));

// first frame
render();
