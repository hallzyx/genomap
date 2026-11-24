const hex=h=>{h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)};
const lum=c=>{const [r,g,b]=hex(c).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b};
const blend=(fg,a,bg)=>{const f=hex(fg),b=hex(bg);return '#'+f.map((v,i)=>Math.round((v*a+b[i]*(1-a))*255).toString(16).padStart(2,'0')).join('')};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const L={bg:'#F5F0E6',surface:'#FFFDF8',s2:'#EDE6D8'}, D={bg:'#0F0E17',surface:'#1A1826',s2:'#0A0911'};
const rows=[
['LIGHT text / bg','#14121F',L.bg],['text / surface','#14121F',L.surface],['text-2 / bg','#46424F',L.bg],['text-3 / bg','#6A6575',L.bg],['text-3 / surface','#6A6575',L.surface],['text-3 / surface-2','#6A6575',L.s2],
['blaze-ink / bg','#AE3A0A',L.bg],['blaze-ink / surface','#AE3A0A',L.surface],['on-blaze / blaze (button)','#14121F','#FF6A2B'],['blaze / bg (graphic)','#FF6A2B',L.bg],['line-strong / surface (input border)','#8A7E69',L.surface],
['signed-ink / signed-soft','#1F43CC','#E3E8FF'],['signed-ink / surface','#1F43CC',L.surface],['anchored-ink / anchored-soft','#08694A','#D6F3E7'],['anchored-ink / surface','#08694A',L.surface],
['weaving-ink / weaving-soft','#5A2FD6','#ECE5FF'],['weaving-ink / surface','#5A2FD6',L.surface],['snag-ink / snag-soft','#B0163B','#FDE2E8'],['snag-ink / surface','#B0163B',L.surface],
['signed / surface (icon)','#2F5BFF',L.surface],['anchored / surface (icon)','#0E9F6E',L.surface],['weaving / surface (icon)','#7C4DFF',L.surface],['snag / surface (icon)','#E0244F',L.surface],['focus / bg','#2F5BFF',L.bg],
['DARK text / bg','#F5F0E6',D.bg],['text / surface','#F5F0E6',D.surface],['text-2 / bg','#CBC5D6',D.bg],['text-3 / bg','#9C96AC',D.bg],['text-3 / surface','#9C96AC',D.surface],
['blaze-ink / bg','#FF9A6A',D.bg],['blaze-ink / surface','#FF9A6A',D.surface],['on-blaze / blaze','#14121F','#FF7A3D'],['blaze / bg','#FF7A3D',D.bg],['line-strong / surface','#6A6480',D.surface],
['signed-ink / signed-soft','#A3B6FF',blend('#7D98FF',.14,D.surface)],['anchored-ink / anchored-soft','#62E2B4',blend('#2FD49A',.13,D.surface)],['weaving-ink / weaving-soft','#BFA8FF',blend('#A88BFF',.14,D.surface)],['snag-ink / snag-soft','#FF8BA3',blend('#FF5C7F',.14,D.surface)],
['signed / surface','#7D98FF',D.surface],['anchored / surface','#2FD49A',D.surface],['weaving / surface','#A88BFF',D.surface],['snag / surface','#FF5C7F',D.surface],['focus / bg','#8FA6FF',D.bg]];
for(const [n,a,b] of rows){const r=cr(a,b);console.log(`| ${n} | ${a} on ${b} | ${r.toFixed(2)}:1 | ${r>=7?'AAA':r>=4.5?'AA':r>=3?'AA large / UI':'FAIL'} |`)}
