import sys,os;sys.path.insert(0,'lab');from glyph import *
from wm_28 import wordmark
B4='Bodoni_28.ttf'; JO='92zPtBhPNqw79Ij1E865zBUv7mz9JQVG.ttf'
S=1.06; ARMX=81
def mono_g(col, uid):
    e,_,_=gpath(B4,'E',300,20,320)
    a,_,_=gpath('ar2.ttf','إ',300*S,0,320)
    tx=ARMX+3-37*S+2
    return (f'<defs><clipPath id="arm{uid}"><rect x="{ARMX}" y="0" width="400" height="400"/></clipPath>'
            f'<clipPath id="alf{uid}"><rect x="-50" y="0" width="300" height="{330-0}"/></clipPath>'
            f'<clipPath id="hmz{uid}"><rect x="-50" y="330" width="300" height="200"/></clipPath></defs>'
            f'<path d="{e}" fill="{col}" clip-path="url(#arm{uid})"/>'
            f'<g transform="translate({tx} 0)"><path d="{a}" fill="{col}" clip-path="url(#alf{uid})"/></g>'
            # hamza: scaled 0.78 about its own centre and lifted
            f'<g transform="translate({tx} 0) translate(40 372) scale(0.78) translate(-40 -372) translate(4 -14)"><path d="{a}" fill="{col}" clip-path="url(#hmz{uid})"/></g>')
def mark_svg(col,uid='m'):  # monogram alone, viewBox fitted
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 80 160 330">{mono_g(col,uid)}</svg>'
def lockup_svg(col,sub,uid='l'):
    # monogram scaled 0.62 centred at x=400 above wordmark
    m=f'<g transform="translate(400 6) scale(0.7) translate(-123 -88)">{mono_g(col,uid)}</g>'
    w,b=wordmark(col,400,328,64,0.32)
    p,_,_=word(JO,'PERFUMES',15,0.85,400,392)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="140 -10 520 425">{m}{w}<path d="{p}" fill="{sub}"/></svg>'
def wordmark_svg(col,sub):
    w,b=wordmark(col,400,150,100,0.30); p,_,_=word(JO,'PERFUMES',18,1.0,400,262)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="105 55 610 220">{w}<path d="{p}" fill="{sub}"/></svg>'
if __name__=='__main__':
    html='<body style="margin:0;display:flex;flex-wrap:wrap">'
    for bg,c,s in (('#F5F3EE','#1F3D33','#56625B'),('#1F3D33','#C9A96E','#C9A96E')):
        html+=f'<div style="background:{bg};width:600px;height:560px;display:grid;place-items:center">{lockup_svg(c,s,bg[1:]).replace("<svg ","<svg width=\"440\" ")}</div>'
    html+=f'<div style="background:#F5F3EE;width:600px;height:400px;display:grid;place-items:center">{mark_svg("#1F3D33","x").replace("<svg ","<svg height=\"330\" ")}</div>'
    html+=f'<div style="background:#16302A;width:600px;height:400px;display:grid;place-items:center">{wordmark_svg("#E9E4D6","#A9BBA4").replace("<svg ","<svg width=\"500\" ")}</div>'
    open('lab/final_28.html','w').write(html)
