from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
F='/tmp/claude-0/-home-user/2fb3ddac-5045-5838-b45a-3aa7f03f3328/scratchpad/fonts/'
_c={}
def font(n):
    if n not in _c: _c[n]=TTFont(F+n)
    return _c[n]
def gpath(fn, ch=None, size=100, x=0, y=0, gname=None):
    f=font(fn); gs=f.getGlyphSet(); upm=f['head'].unitsPerEm; k=size/upm
    n=gname or f.getBestCmap()[ord(ch)]
    pen=SVGPathPen(gs); gs[n].draw(TransformPen(pen,(k,0,0,-k,x,y)))
    bp=BoundsPen(gs); gs[n].draw(TransformPen(bp,(k,0,0,-k,x,y)))
    return pen.getCommands(), bp.bounds, gs[n].width*k
def word(fn, s, size, track_em, cx, y):
    f=font(fn); gs=f.getGlyphSet(); cm=f.getBestCmap(); k=size/f['head'].unitsPerEm
    def run(x0):
        x=x0; d=''; bp=BoundsPen(gs); pos=[]
        for c in s:
            n=cm[ord(c)]; pen=SVGPathPen(gs); t=(k,0,0,-k,x,y)
            gs[n].draw(TransformPen(pen,t)); gs[n].draw(TransformPen(bp,t)); d+=pen.getCommands(); pos.append(x); x+=gs[n].width*k+track_em*size
        return d,bp.bounds,pos
    _,b,_=run(0); return run(cx-(b[2]-b[0])/2-b[0])
