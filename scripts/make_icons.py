#!/usr/bin/env python3
"""Generar íconos PNG para PWA CoachFit AI"""
from PIL import Image, ImageDraw
import os

OUT_DIR = "/home/z/my-project/public"

def make_icon(size: int, path: str):
    img = Image.new('RGBA', (size, size), (5, 150, 105, 255))  # emerald-600
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    bar_w = int(size * 0.5)
    bar_h = int(size * 0.08)
    draw.rectangle([cx - bar_w // 2, cy - bar_h // 2, cx + bar_w // 2, cy + bar_h // 2], fill='white')
    weight_w = int(size * 0.08)
    weight_h = int(size * 0.28)
    draw.rectangle([cx - bar_w // 2 - weight_w, cy - weight_h // 2, cx - bar_w // 2, cy + weight_h // 2], fill='white')
    draw.rectangle([cx + bar_w // 2, cy - weight_h // 2, cx + bar_w // 2 + weight_w, cy + weight_h // 2], fill='white')
    img.save(path)
    print(f"Created {path}")

make_icon(192, os.path.join(OUT_DIR, "icon-192.png"))
make_icon(512, os.path.join(OUT_DIR, "icon-512.png"))
print("Done")
