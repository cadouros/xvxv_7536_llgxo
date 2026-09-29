# Gera o ícone provisório do carolii (um "bloco do dia" do calendário).
# Uso: python icons/gerar_icone_provisorio.py
# Precisa do Pillow (pip install pillow). Só é rodado no computador, não no app.
from pathlib import Path
from PIL import Image, ImageDraw

FUNDO = "#FAF6EC"
PRETO = "#000000"
VERDE = "#CEDC8E"   # seguiu (clarinha)
ROSA = "#DEAEAF"    # livre (clarinha)

S = 1024  # desenha grande e depois reduz, para as bordas ficarem lisas
img = Image.new("RGB", (S, S), FUNDO)  # RGB = sem transparência
d = ImageDraw.Draw(img)

# Bloco do dia
d.rounded_rectangle((212, 212, 812, 812), radius=90, fill=FUNDO, outline=PRETO, width=28)

# Quadradinhos: 3 na linha do meio, 2 na de baixo
q, gap = 130, 30
def linha(y, cores):
    total = len(cores) * q + (len(cores) - 1) * gap
    x = (S - total) // 2
    for cor in cores:
        d.rounded_rectangle((x, y, x + q, y + q), radius=22, fill=cor, outline=PRETO, width=14)
        x += q + gap

linha(420, [VERDE, VERDE, ROSA])
linha(420 + q + gap, [VERDE, VERDE])

pasta = Path(__file__).parent
for tam, nome in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
    img.resize((tam, tam), Image.LANCZOS).save(pasta / nome)
print("ícones gerados")
