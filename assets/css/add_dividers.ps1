$path = "c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\assets\css\style.css"
$dividerCss = @"

/* DIVISORES DE PIEDRA GLOBALES PARA CADA SECCIN */
.origin-section, .home-status-strip, .upcoming-events, .classes-showcase {
    position: relative !important;
    padding-bottom: 120px !important; /* Espacio aumentado para el divisor */
}

.origin-section::after, 
.home-status-strip::after, 
.upcoming-events::after, 
.classes-showcase::after {
    content: '' !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 100% !important;
    height: 80px !important;
    background: url('../images/newimg/stone-divider-btm-max.jpg') no-repeat center bottom !important;
    background-size: contain !important;
    z-index: 50 !important;
    opacity: 1 !important;
    pointer-events: none !important;
}

/* Invertir el divisor para la parte superior de algunas secciones si es necesario */
.home-status-strip::before {
    content: '' !important;
    position: absolute !important;
    top: 0 !important;
    left: 50% !important;
    transform: translateX(-50%) scaleY(-1) !important;
    width: 100% !important;
    height: 80px !important;
    background: url('../images/newimg/stone-divider-btm-max.jpg') no-repeat center bottom !important;
    background-size: contain !important;
    z-index: 50 !important;
    opacity: 1 !important;
}
"@
Add-Content -Path $path -Value $dividerCss -Encoding UTF8
