import sys;sys.path.insert(0,'lab');from glyph import *
B4='Bodoni_28.ttf'
def wordmark(col, cx=400, y=150, size=100, track=0.30):
    d,b,pos=word(B4,'EVOOUE',size,track,cx,y)
    k=size/100
    ox=pos[3]; # O origin
    # O spans ox+4.2 .. ox+68.2 at size100 ; centre ~ ox+36 ; bottom y
    X=lambda v: ox+v*k; Y=lambda v: y+v*k
    # tapered swash from bottom of O, sweeping under U and E
    tail=(f'M{X(34)} {Y(-3)} C{X(50)} {Y(22)} {X(120)} {Y(34)} {X(200)} {Y(30)} '
          f'C{X(232)} {Y(28.5)} {X(252)} {Y(25)} {X(266)} {Y(22)} '
          f'C{X(250)} {Y(27.4)} {X(230)} {Y(30.6)} {X(200)} {Y(32.2)} '
          f'C{X(118)} {Y(37.5)} {X(46)} {Y(26)} {X(28)} {Y(-1)} Z')
    # drop at the end, pointing back along the tail
    drop=(f'M{X(262)} {Y(22.9)} C{X(268)} {Y(20)} {X(275)} {Y(15.5)} {X(279)} {Y(17)} '
          f'C{X(283)} {Y(18.6)} {X(282)} {Y(24)} {X(277)} {Y(25)} C{X(272)} {Y(26)} {X(266)} {Y(24)} {X(262)} {Y(22.9)} Z')
    return f'<path d="{d}" fill="{col}"/><path d="{tail}" fill="{col}"/><path transform="translate({X(272)} {Y(21)}) scale(1.45) translate({-X(272)} {-Y(21)})" d="{drop}" fill="{col}"/>', b
if __name__=='__main__':
    g,b=wordmark('#1F3D33')
    open('lab/wm.html','w').write(f'<body style="margin:0"><svg width="1200" height="330" viewBox="100 50 600 165" style="background:#F5F3EE">{g}</svg>')
