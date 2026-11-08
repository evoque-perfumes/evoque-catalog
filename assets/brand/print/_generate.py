import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
F='fonts/'
COR=TTFont(F+'co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_s06GnM.ttf')
JOST=TTFont(F+'92zPtBhPNqw79Ij1E865zBUv7mz9JQVG.ttf')
for f in (COR,JOST): print(f['name'].getDebugName(4), 'fvar' in f)

def text_path(font, s, size, track_em, cx, baseline):
    gs=font.getGlyphSet(); cmap=font.getBestCmap(); upm=font['head'].unitsPerEm; k=size/upm
    names=[cmap[ord(c)] for c in s]
    adv=[gs[n].width*k for n in names]; tr=track_em*size
    total=sum(adv)+tr*(len(s)-1)
    # visual width excludes side bearings of first/last roughly; fine
    x=0
    bp=BoundsPen(gs)
    for n,a in zip(names,adv):
        gs[n].draw(TransformPen(bp,(k,0,0,-k,x,baseline))); x+=a+tr
    x0,_,x1,_=bp.bounds
    x=cx-(x1-x0)/2-x0; d=''
    for n,a in zip(names,adv):
        pen=SVGPathPen(gs); gs[n].draw(TransformPen(pen,(k,0,0,-k,x,baseline))); d+=pen.getCommands()
        x+=a+tr
    return d

E=text_path(COR,'E',136,0,120,236)
E2=text_path(COR,'E',150,0,120,244)
ARCH_OUT='M30 288 V128 A90 90 0 0 1 210 128 V288 Z'
ARCH_IN='M44 276 V130 A76 76 0 0 1 196 130 V276 Z'
DROP='M120 66 C120 66 106 84 106 93 a14 14 0 0 0 28 0 C134 84 120 66 120 66 Z'
def mark_small(main,accent):
    return (f'<path d="{ARCH_OUT}" fill="none" stroke="{main}" stroke-width="9"/><path d="{DROP}" fill="{accent}"/><path d="{E2}" fill="{main}"/>')
def mark(main,accent,ox=0,oy=0):
    return (f'<g transform="translate({ox} {oy})"><path d="{ARCH_OUT}" fill="none" stroke="{main}" stroke-width="5"/>'
            f'<path d="{ARCH_IN}" fill="none" stroke="{main}" stroke-width="2.4"/>'
            f'<path d="{DROP}" fill="{accent}"/><path d="{E}" fill="{main}"/></g>')
# lockup: width 520, arch centered
W=520
EVQ=text_path(COR,'EVOQUE',78,0.32,W/2,372)
PRF=text_path(JOST,'PERFUMES',21,0.62,W/2,418)
def lockup(main,accent,sub):
    return (mark(main,accent,(W-240)/2,0)+f'<path d="{EVQ}" fill="{main}"/><path d="{PRF}" fill="{sub}"/>')
VARIANTS={
 'green':('#1F3D33','#B8653F','#56625B'),
 'white':('#F5F3EE','#E0A07E','#CFD9CB'),
 'onecolor-green':('#1F3D33',)*3,
 'onecolor-black':('#000000',)*3,
 'onecolor-gold':('#B08D57',)*3,
}
os.makedirs('out',exist_ok=True)
for v,(m,a,s) in VARIANTS.items():
    open(f'out/evoque-logo-{v}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 6 {W+48} 436">{lockup(m,a,s)}</svg>')
    open(f'out/evoque-mark-{v}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 20 216 282">{mark(m,a)}</svg>')
    open(f'out/evoque-mark-small-{v}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 20 216 282">{mark_small(m,a)}</svg>')
print('done')
