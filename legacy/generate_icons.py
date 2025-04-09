from PIL import Image, ImageDraw
import os

def create_icon(size):
    # 새로운 이미지 생성 (흰색 배경)
    img = Image.new('RGB', (size, size), color='white')
    draw = ImageDraw.Draw(img)
    
    # 중앙에 파란색 원 그리기
    center = size // 2
    radius = size // 3
    draw.ellipse([center-radius, center-radius, center+radius, center+radius], 
                 fill='#1E88E5')
    
    return img

# icons 디렉토리 생성
os.makedirs('icons', exist_ok=True)

# 192x192 아이콘 생성
icon_192 = create_icon(192)
icon_192.save('icons/icon-192x192.png')

# 512x512 아이콘 생성
icon_512 = create_icon(512)
icon_512.save('icons/icon-512x512.png') 