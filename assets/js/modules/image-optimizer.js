/**
 * Image Optimization Module
 * Optimiza carga y rendering de imágenes
 */

class ImageOptimizer {
    static optimize() {
        this.lazyLoadImages();
        this.useResponsiveImages();
        this.enableWebP();
        this.compressLargeImages();
    }

    /**
     * Lazy load images usando IntersectionObserver
     */
    static lazyLoadImages() {
        if (!('IntersectionObserver' in window)) return;

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const img = entry.target;
                
                // Cargar el src real
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
                
                // Cargar srcset si existe
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }

                // Cargar sizes si existe
                if (img.dataset.sizes) {
                    img.sizes = img.dataset.sizes;
                }

                img.classList.add('loaded');
                observer.unobserve(img);
            });
        }, {
            rootMargin: '50px' // Precargar 50px antes de ser visible
        });

        // Observar todas las imágenes con la clase lazy
        document.querySelectorAll('img[data-src], img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }

    /**
     * Usar imágenes responsivas con srcset
     */
    static useResponsiveImages() {
        document.querySelectorAll('img[data-srcset]').forEach(img => {
            if (!img.srcset && img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
            }
        });
    }

    /**
     * Priorizar WebP si el navegador lo soporta
     */
    static enableWebP() {
        const webpSupport = this.checkWebPSupport();
        
        if (webpSupport) {
            document.querySelectorAll('picture').forEach(picture => {
                const img = picture.querySelector('img');
                const webpSource = document.createElement('source');
                
                if (img.dataset.webpSrc) {
                    webpSource.srcset = img.dataset.webpSrc;
                    webpSource.type = 'image/webp';
                    picture.insertBefore(webpSource, img);
                }
            });
        }
    }

    /**
     * Detectar soporte de WebP
     */
    static checkWebPSupport() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    }

    /**
     * Usar blur-up technique para imágenes grandes
     */
    static compressLargeImages() {
        document.querySelectorAll('img[data-blur]').forEach(img => {
            const blurSrc = img.dataset.blur;
            
            if (!img.src && blurSrc) {
                img.src = blurSrc;
                img.style.filter = 'blur(20px)';
                
                // Remover blur cuando la imagen real cargue
                const realSrc = img.dataset.src;
                if (realSrc) {
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        img.src = realSrc;
                        img.style.filter = '';
                        img.classList.add('loaded');
                    };
                    tempImg.src = realSrc;
                }
            }
        });
    }

    /**
     * Precargar imágenes críticas
     */
    static preloadCriticalImages(urls = []) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
        });
    }
}

// Inicializar cuando document está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ImageOptimizer.optimize();
    });
} else {
    ImageOptimizer.optimize();
}

// Observador de mutaciones para nuevas imágenes agregadas dinámicamente
const observer = new MutationObserver(() => {
    ImageOptimizer.lazyLoadImages();
    ImageOptimizer.enableWebP();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Export
window.ImageOptimizer = ImageOptimizer;
