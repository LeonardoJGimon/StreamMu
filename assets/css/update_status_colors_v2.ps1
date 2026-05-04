$path = "c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\assets\css\style.css"
$content = Get-Content $path
# Title with gradient effect exactly like the screenshot
$gradientTitle = "body.page-home .home-status-strip__title { background: linear-gradient(to bottom, #ffffff 20%, #9d0a0e 80%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Exocet', serif !important; font-size: 4.5rem !important; text-transform: uppercase !important; letter-spacing: 4px !important; text-shadow: 0 0 30px rgba(157, 10, 14, 0.4) !important; margin: 0 !important; line-height: 1 !important; }"

# Eyebrow in pure white
$whiteEyebrow = "body.page-home .home-status-strip__eyebrow { color: #ffffff !important; font-family: 'Exocet', serif !important; font-size: 1.2rem !important; letter-spacing: 7px !important; margin-bottom: 10px !important; text-shadow: 0 0 10px rgba(0, 0, 0, 0.8) !important; opacity: 1 !important; }"

# Replace the specific lines
$content[12509] = $whiteEyebrow
$content[12510] = $gradientTitle
# Remove the other redundant definitions to avoid conflicts
$content[12516] = "/* Overridden by gradient title above */"
$content[12517] = "/* Overridden by white eyebrow above */"

$content | Set-Content $path -Encoding UTF8
