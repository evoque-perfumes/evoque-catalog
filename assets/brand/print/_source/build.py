import sys,os,shutil;sys.path.insert(0,'lab')
from final_28 import mark_svg, lockup_svg, wordmark_svg
O='out2'; os.makedirs(O,exist_ok=True)
V={'green':('#1F3D33','#56625B'),'gold':('#B8975A','#B8975A'),'cream':('#F2EDE1','#C9D3C5'),'black':('#000000','#000000')}
for v,(c,s) in V.items():
    open(f'{O}/evoque-logo-{v}.svg','w').write(lockup_svg(c,s,'L'+v))
    open(f'{O}/evoque-monogram-{v}.svg','w').write(mark_svg(c,'M'+v))
    open(f'{O}/evoque-wordmark-{v}.svg','w').write(wordmark_svg(c,s))
