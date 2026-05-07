import base64
import os

font_path = r'c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\assets\images\font\ExocetImmortal-Medium.otf'
target_file = r'c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\stream-overlay\BOTRIX-MASTER-CODE.txt'

with open(font_path, 'rb') as f:
    font_data = base64.b64encode(f.read()).decode('utf-8')

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace('base64,AAEAAAARAQAABAAQRkZUTXb+...', f'base64,{font_data}')

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Font injected successfully!")
