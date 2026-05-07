import base64
import os

base_path = r'c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\stream-overlay'
font_path = r'c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\assets\images\font\ExocetImmortal-Medium.otf'

with open(font_path, 'rb') as f:
    font_base64 = base64.b64encode(f.read()).decode('utf-8')

css_base = f"""<style>
    @font-face {{
        font-family: 'ExocetReal';
        src: url(data:font/opentype;base64,{font_base64}) format('opentype');
    }}

    :root {{
        --gold: #c0a375;
        --gold-bright: #f0d7a9;
        --dark: #0a0a0a;
        --shine-speed: 4s;
    }}

    .mu-alert-wrapper {{
        width: 800px;
        height: 160px;
        position: relative;
        margin: 20px auto;
        display: flex;
        align-items: center;
        padding: 0 50px;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        border: 2px solid var(--gold);
        clip-path: polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%);
        box-shadow: 0 15px 45px rgba(0,0,0,0.8);
        overflow: hidden;
    }}

    .mu-alert-wrapper::after {{
        content: '';
        position: absolute;
        top: -100%; left: -100%;
        width: 30%; height: 300%;
        background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), rgba(192, 163, 117, 0.4), transparent);
        transform: rotate(25deg);
        animation: lightSweep var(--shine-speed) infinite ease-in-out;
    }}

    @keyframes lightSweep {{
        0% {{ left: -100%; }}
        15% {{ left: 150%; }}
        100% {{ left: 150%; }}
    }}

    .mu-avatar {{
        width: 110px; height: 110px;
        border: 3px solid var(--gold);
        border-radius: 50%;
        overflow: hidden;
        z-index: 10;
        box-shadow: 0 0 25px rgba(192, 163, 117, 0.4);
        margin-right: 35px;
    }}
    .mu-avatar img {{ width: 100%; height: 100%; object-fit: cover; }}

    .mu-content {{ display: flex; flex-direction: column; z-index: 10; }}

    .mu-label {{
        font-family: 'ExocetReal', serif !important;
        font-size: 1.4rem;
        color: var(--gold);
        letter-spacing: 4px;
        text-shadow: 2px 2px 4px #000;
        margin-bottom: -5px;
    }}

    .mu-username {{
        font-family: 'ExocetReal', serif !important;
        font-size: 4.5rem;
        text-transform: uppercase;
        letter-spacing: 8px;
        background: linear-gradient(to bottom, #ffffff 20%, #b0b0b0 80%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(-4px 4px 0px #000);
        animation: textPulse 3s infinite ease-in-out;
    }}

    @keyframes textPulse {{
        0%, 100% {{ transform: scale(1); filter: brightness(1) drop-shadow(-4px 4px 0px #000); }}
        50% {{ transform: scale(1.02); filter: brightness(1.3) drop-shadow(-4px 4px 0px #000); }}
    }}

    /* VARIACIONES */
    .mu-alert-wrapper.gold-tier {{ border-color: #ffcc00; box-shadow: 0 0 40px rgba(255, 204, 0, 0.2); }}
    .mu-amount {{
        font-family: 'ExocetReal', serif !important;
        font-size: 3.5rem;
        background: linear-gradient(to bottom, #fff3b0 0%, #ff9800 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-left: 20px;
        filter: drop-shadow(0 0 10px rgba(255, 152, 0, 0.5));
    }}
    .mu-msg-box {{
        font-family: 'Arial', sans-serif;
        font-size: 1.1rem; color: #eee;
        font-style: italic;
        margin-top: 8px;
        padding-left: 15px;
        border-left: 2px solid #ffcc00;
        max-width: 450px;
    }}

    .mu-alert-wrapper.member-tier {{
        border-color: #ff0000;
        box-shadow: 0 0 40px rgba(255, 0, 0, 0.3);
        background: linear-gradient(135deg, #0a0000 0%, #2a0000 100%);
    }}
    .mu-alert-wrapper.member-tier .mu-label {{ color: #ff4d4d; text-shadow: 0 0 10px rgba(255, 0, 0, 0.6); }}
    .mu-alert-wrapper.member-tier .mu-username {{
        background: linear-gradient(to bottom, #ffcccc 20%, #ff0000 80%);
        -webkit-background-clip: text;
        filter: drop-shadow(-4px 4px 0px #000) drop-shadow(0 0 10px rgba(255, 0, 0, 0.4));
    }}
    .mu-tier-label {{
        font-family: 'ExocetReal', serif !important;
        font-size: 1.8rem;
        color: #ff4d4d;
        margin-top: 5px;
        letter-spacing: 2px;
    }}

    .mu-alert-wrapper.tip-tier {{
        border-color: #00d4ff;
        box-shadow: 0 0 40px rgba(0, 212, 255, 0.3);
        background: linear-gradient(135deg, #000a1a 0%, #001a2a 100%);
    }}
    .mu-alert-wrapper.tip-tier .mu-label {{ color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.6); }}
    .mu-alert-wrapper.tip-tier .mu-username {{
        background: linear-gradient(to bottom, #e0f7ff 20%, #00d4ff 80%);
        -webkit-background-clip: text;
        filter: drop-shadow(-4px 4px 0px #000) drop-shadow(0 0 10px rgba(0, 212, 255, 0.4));
    }}
    .mu-alert-wrapper.tip-tier .mu-amount {{
        background: linear-gradient(to bottom, #fff 0%, #00d4ff 100%);
        -webkit-background-clip: text;
        filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.5));
    }}
    .mu-alert-wrapper.tip-tier .mu-msg-box {{ border-left: 2px solid #00d4ff; }}

    .mu-alert-wrapper.gift-tier {{
        border-color: #00ff9d;
        box-shadow: 0 0 40px rgba(0, 255, 157, 0.3);
        background: linear-gradient(135deg, #001a0a 0%, #002a1a 100%);
    }}
    .mu-alert-wrapper.gift-tier .mu-label {{ color: #00ff9d; text-shadow: 0 0 10px rgba(0, 255, 157, 0.6); }}
    .mu-alert-wrapper.gift-tier .mu-username {{
        background: linear-gradient(to bottom, #e0fff4 20%, #00ff9d 80%);
        -webkit-background-clip: text;
        filter: drop-shadow(-4px 4px 0px #000) drop-shadow(0 0 10px rgba(0, 255, 157, 0.4));
    }}
    .mu-gift-count {{
        font-family: 'ExocetReal', serif !important;
        font-size: 2.2rem;
        color: #fff;
        margin-top: 5px;
        letter-spacing: 2px;
        text-shadow: 0 0 10px #00ff9d;
    }}

    .mu-alert-wrapper.raid-tier {{
        border-color: #ff9800;
        box-shadow: 0 0 40px rgba(255, 152, 0, 0.3);
        background: linear-gradient(135deg, #1a0a00 0%, #2a1a00 100%);
    }}
    .mu-alert-wrapper.raid-tier .mu-label {{ color: #ff9800; text-shadow: 0 0 10px rgba(255, 152, 0, 0.6); }}
    .mu-alert-wrapper.raid-tier .mu-username {{
        background: linear-gradient(to bottom, #fff3b0 20%, #ff9800 80%);
        -webkit-background-clip: text;
        filter: drop-shadow(-4px 4px 0px #000) drop-shadow(0 0 10px rgba(255, 152, 0, 0.4));
    }}
</style>
"""

blocks = {
    "1-SUSCRIPCION.txt": """<div class="mu-alert-wrapper">
    <div class="mu-avatar"><img src="{image}"></div>
    <div class="mu-content">
        <div class="mu-label">NUEVA SUSCRIPCIÓN</div>
        <div class="mu-username">{user}</div>
    </div>
</div>""",
    "2-SUPERCHAT.txt": """<div class="mu-alert-wrapper gold-tier">
    <div class="mu-avatar" style="border-color: #ffcc00;"><img src="{image}"></div>
    <div class="mu-content">
        <div style="display: flex; align-items: baseline;">
            <div class="mu-label">SUPERCHAT DE</div>
            <div class="mu-username" style="font-size: 2.8rem; margin-left:15px;">{user}</div>
            <div class="mu-amount">{amount}</div>
        </div>
        <div class="mu-msg-box">"{message}"</div>
    </div>
</div>""",
    "3-PROPINA.txt": """<div class="mu-alert-wrapper tip-tier">
    <div class="mu-avatar" style="border-color: #00d4ff;"><img src="{image}"></div>
    <div class="mu-content">
        <div style="display: flex; align-items: baseline;">
            <div class="mu-label">PROPINA DE</div>
            <div class="mu-username" style="font-size: 2.8rem; margin-left:15px;">{user}</div>
            <div class="mu-amount">{amount}</div>
        </div>
        <div class="mu-msg-box">"{message}"</div>
    </div>
</div>""",
    "4-MIEMBRO.txt": """<div class="mu-alert-wrapper member-tier">
    <div class="mu-avatar" style="border-color: #ff0000;"><img src="{image}"></div>
    <div class="mu-content">
        <div class="mu-label">NUEVO MIEMBRO</div>
        <div class="mu-username">{user}</div>
        <div class="mu-tier-label">NIVEL {tier}</div>
    </div>
</div>""",
    "5-MIEMBRO-REGALADO.txt": """<div class="mu-alert-wrapper gift-tier">
    <div class="mu-avatar" style="border-color: #00ff9d;"><img src="{image}"></div>
    <div class="mu-content">
        <div class="mu-label">MIEMBRO REGALADO POR</div>
        <div class="mu-username">{user}</div>
        <div class="mu-gift-count">REPARTIÓ {amount} MEMBRESÍAS</div>
    </div>
</div>""",
    "6-RAID.txt": """<div class="mu-alert-wrapper raid-tier">
    <div class="mu-avatar" style="border-color: #ff9800;"><img src="{image}"></div>
    <div class="mu-content">
        <div style="display: flex; align-items: baseline;">
            <div class="mu-label">RAID DE</div>
            <div class="mu-username" style="font-size: 3.2rem; margin-left:15px;">{user}</div>
            <div class="mu-amount" style="font-size: 2.5rem; color: #ff9800;">{amount} PERSONAS</div>
        </div>
    </div>
</div>"""
}

for filename, html in blocks.items():
    with open(os.path.join(base_path, filename), 'w', encoding='utf-8') as f:
        f.write(css_base + "\n" + html)
