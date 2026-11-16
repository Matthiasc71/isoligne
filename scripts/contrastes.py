"""Contrastes WCAG des tokens Isoligne (fond nu et fond + grille majeure)."""
import sys

def hx(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(c): c /= 255; return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
def lum(rgb): r, g, b = map(lin, rgb); return 0.2126*r + 0.7152*g + 0.0722*b
def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la+0.05)/(lb+0.05)
def blend(fg, alpha, bg): return tuple(round(f*alpha + b*(1-alpha)) for f, b in zip(fg, bg))

MODES = {
  'sombre': dict(fond='#0F2D52', trait='#D6E4F0', trait2='#8FB0CF', redline='#FF8064', grille=('#D6E4F0', .08)),
  'clair':  dict(fond='#EEF1EC', trait='#1F4E8C', trait2='#44658C', redline='#B8321C', grille=('#1F4E8C', .07)),
}
# Palette finale (proposée le 16.11.2026, cf. design/decisions.md)
CALQUES = {  # nom: (sombre, clair)
  'orange': ('#FFA552', '#B0601E'), 'vert-deau': ('#7FD1B9', '#2C8572'),
  'lilas': ('#C3A6FF', '#7A5CC2'), 'ocre': ('#FFD166', '#8F741C'),
  'vert': ('#9BD38A', '#448540'), 'ciel': ('#9AD0FF', '#2F6FB0'),
  'rose': ('#FF9FB2', '#C24D6A'), 'craie': ('#E6E6E6', '#5A5F66'),
}


def rapport():
  for m, t in MODES.items():
      fond = hx(t['fond']); g = blend(hx(t['grille'][0]), t['grille'][1], fond)
      print(f'== {m}  (fond {t["fond"]}, fond+grille {"#%02X%02X%02X" % g})')
      for k in ('trait', 'trait2', 'redline'):
          print(f'  {k:8} {t[k]}  {ratio(hx(t[k]), fond):5.2f} / {ratio(hx(t[k]), g):5.2f}')
      i = 0 if m == 'sombre' else 1
      for n, c in CALQUES.items():
          r1, r2 = ratio(hx(c[i]), fond), ratio(hx(c[i]), g)
          flag = 'texte OK' if min(r1, r2) >= 4.5 else ('graphique OK' if min(r1, r2) >= 3 else 'INSUFFISANT')
          print(f'  {n:10} {c[i]}  {r1:5.2f} / {r2:5.2f}  {flag}')


if __name__ == '__main__':
    rapport()
