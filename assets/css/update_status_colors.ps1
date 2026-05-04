$path = "c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\assets\css\style.css"
$content = Get-Content $path
$content[12509] = "body.page-home .home-status-strip__eyebrow { color: #ffffff !important; font-family: 'Exocet', serif !important; font-size: 1rem !important; letter-spacing: 5px !important; margin-bottom: 10px !important; text-shadow: 0 0 10px rgba(0, 0, 0, 0.5) !important; }"
$content[12510] = "body.page-home .home-status-strip__title { color: #9d0a0e !important; font-family: 'Exocet', serif !important; font-size: 3rem !important; text-transform: uppercase !important; letter-spacing: 2px !important; text-shadow: 0 0 20px rgba(157, 10, 14, 0.6), 0 0 5px rgba(0, 0, 0, 0.8) !important; margin: 0 !important; }"
$content[12516] = "body.page-home .home-status-strip__title { font-size: 4.5rem !important; letter-spacing: 4px !important; text-shadow: 0 0 30px rgba(157, 10, 14, 0.9), 0 0 10px rgba(0,0,0,1) !important; }"
$content | Set-Content $path -Encoding UTF8
