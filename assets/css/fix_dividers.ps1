$path = "c:\Users\LeonardoGimon\Downloads\AnyServer\Any-Web-Public\public\assets\css\style.css"
$fixCss = @"

/* FIX PARA DIVISORES: ASEGURAR VISIBILIDAD */
.upcoming-events, .origin-section, .home-status-strip, .classes-showcase {
    overflow: visible !important;
}

/* Divisor superior para la seccin de eventos para separar de la anterior */
.upcoming-events::before {
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
Add-Content -Path $path -Value $fixCss -Encoding UTF8
