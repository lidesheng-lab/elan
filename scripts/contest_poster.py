"""Render an edition-specific pleated sculpture and bilingual editorial typography."""
from functools import lru_cache
from hashlib import sha256
from math import cos, sin, pi
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont

# Paper, deepest fold, midtone, reflected light.
STOCKS = [
    ("#e9e7e1", "#161823", "#444659", "#e5e5f1"),
    ("#eae2dd", "#321223", "#7d334d", "#f2bdc8"),
    ("#e1e7e5", "#14272c", "#416760", "#d6e6d8"),
    ("#e5e8ee", "#141e3d", "#405a90", "#cdddf8"),
    ("#ede5d8", "#2d211e", "#87624b", "#edd4aa"),
]


@lru_cache(maxsize=None)
def font(family, size):
    path = subprocess.check_output(["fc-match", "-f", "%{file}", family], text=True)
    return ImageFont.truetype(path, size)


def rgb(hex_color):
    return tuple(bytes.fromhex(hex_color[1:]))


def sculpture(pen, seed, colors, twists):
    # A folded strip closes around an elliptic path. Draw back faces first.
    dark, mid, light = map(rgb, colors)
    phase = seed[2] / 255 * 2*pi
    lean = (seed[3] / 255 - .5) * .68
    segments = 192
    points = []
    for step in range(segments):
        angle = step * 2*pi / segments
        twist = twists * angle + phase
        row = []
        for band in range(13):
            edge = band/6-1
            width = edge * (51 + 14*sin(2*angle + phase))
            radius = 175 + 29*cos(3*angle + phase) + width*cos(twist)
            x = radius*cos(angle)
            y = radius*sin(angle)*.63 + width*sin(twist) + 27*sin(2*angle + phase)
            row.append((464 + 1.63*(x*cos(lean)-y*sin(lean)),
                        323 + 1.22*(x*sin(lean)+y*cos(lean))))
        points.append(row)
    faces = []
    for step in range(segments):
        angle = (step+.5)*2*pi/segments
        lightness = .48 + .27*cos(2*angle + phase) + .18*sin(angle) + (.12 if step%2 else -.13)
        value = max(0,min(1,lightness))*2
        low, high = (dark, mid) if value<1 else (mid, light)
        mix = min(value, 2) if value<1 else value-1
        color = tuple(round(a+(b-a)*mix) for a,b in zip(low,high))
        near = points[step]
        far = points[(step+1)%segments]
        for band in range(12):
            sheen = .89 + .17*cos((band/12-.5)*pi + sin(angle+phase))
            tint = tuple(min(255, round(c*sheen)) for c in color)
            faces.append((sin(angle)*.8+cos(twists*angle+phase)*.3,
                          [near[band],near[band+1],far[band+1],far[band]],tint))
    for _, poly, color in sorted(faces,key=lambda face:face[0]):
        pen.polygon(poly,fill=color)


def poster(path, item, title, label, date):
    seed = sha256(item["id"].encode()).digest()
    category = item["category"]
    index = next((index for key,index in [
        ("非遗",1),("汉服",1),("可持续",2),("针织",2),("数字",3),
        ("校园",3),("珠宝",4),("皮具",4)
    ] if key in category), seed[0]%5)
    if item["id"].startswith("lvmh"):
        index = 0
    paper, *colors = STOCKS[index]
    image = Image.new("RGB",(900,900),paper)
    pen = ImageDraw.Draw(image)
    ink = colors[0]
    sculpture(pen,seed,colors,2+seed[1]%3)
    serif = "Noto Serif CJK SC:lang=zh-cn"
    sans = "Noto Sans CJK SC:lang=zh-cn"
    pen.text((45,38),"ÉLAN",font=font("Liberation Serif",77),fill=ink,anchor="lt")
    pen.text((853,51),date.split()[-1][:4],font=font("Liberation Serif",47),anchor="rt",fill=ink)
    pen.line((48,565,852,565),fill=ink,width=2)
    pen.text((48,584),label+"   /   "+category,font=font(sans,24),fill=ink,anchor="lt")
    for size in range(57,21,-2):
        face = font(serif,size)
        lines = [""]
        total = pen.textlength(title,font=face)
        target = min(802, total/(int(total//802)+1) + size*.9)
        for token in re.findall(r"[A-Za-z0-9]+(?:[-’'][A-Za-z0-9]+)*|.",title):
            if lines[-1] and pen.textlength(lines[-1]+token,font=face)>target:
                lines.append("")
            lines[-1] += token if lines[-1] else token.lstrip()
        if len(lines)*(size+11)<=175 and all(pen.textlength(line,font=face)<=802 for line in lines):
            break
    for n,line in enumerate(lines):
        pen.text((46,635+n*(size+11)),line.rstrip(),font=face,fill=ink,anchor="lt")
    pen.line((48,824,852,824),fill=ink)
    caption, value = date.split()
    pen.text((48,844),caption,font=font(sans,23),fill=ink,anchor="lt")
    pen.text((852,844),value.replace("-","."),font=font("DejaVu Sans Mono",24),fill=ink,anchor="rt")
    image.save(path,"JPEG",quality=92,optimize=True)
