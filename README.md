# Mu Neutro - Stream Overlay (Cloud Ready)

Este proyecto contiene los widgets de overlay para el stream de Mu Neutro, optimizados para funcionar tanto localmente como en la nube (Vercel/GitHub).

## Estructura
- `/public`: Contiene los archivos HTML, CSS e imágenes del overlay.
- `/api`: Contiene la lógica de servidor para consultar la base de datos en tiempo real.

## Despliegue en Vercel
Para que funcione en internet sin consumir recursos de tu PC:

1.  **Sube este código a GitHub:**
    - Crea un nuevo repositorio en GitHub.
    - Sube todos los archivos (el `.gitignore` evitará que se suban cosas innecesarias).

2.  **Conecta con Vercel:**
    - Ve a [Vercel.com](https://vercel.com) e inicia sesión con GitHub.
    - Importa tu repositorio.

3.  **Configura las Variables de Entorno (Environment Variables):**
    En la configuración de tu proyecto en Vercel, añade las siguientes variables:
    - `DB_SERVER`: Tu IP o host de la base de datos (`vps-6eed550e.vps.ovh.ca`).
    - `DB_USER`: Tu usuario (`sa`).
    - `DB_PASSWORD`: Tu contraseña (la de tu `database.json`).
    - `DB_NAME`: `MuOnline`.
    - `DB_PORT`: `1433`.

## Uso en OBS
Una vez desplegado, usa la URL de Vercel en tus fuentes de navegador de OBS:
`https://tu-proyecto.vercel.app/stream-overlay/ranking.html`

Esto hará que las consultas a la base de datos sean en tiempo real y no consuman memoria de tu computadora.
