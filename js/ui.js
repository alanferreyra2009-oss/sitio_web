/* =========================================================================
   Pokepedia — UI: componentes reutilizables (tarjetas, chips, estados)
   ========================================================================= */

PW.ui = (function () {
    'use strict';

    var C = PW.config;
    var U = PW.utils;
    var store = PW.store;

    /* ---------- Estados de carga / error / vacío ---------- */
    function loader(msg) {
        return '<div class="loader">' + U.esc(msg || 'Cargando...') + '</div>';
    }
    function empty(msg) {
        return '<div class="empty-state">' + U.esc(msg || 'Sin resultados.') + '</div>';
    }
    function error(msg, retryId) {
        return '<div class="empty-state"><strong>' + U.esc(msg || 'Algo salió mal.') + '</strong><br>' +
            'Revisa tu conexión e inténtalo de nuevo.<br><br>' +
            (retryId ? '<button class="btn-primary" id="' + retryId + '">Reintentar</button>' : '') +
            '</div>';
    }

    /* ---------- Imágenes con respaldo ---------- */
    /* <img> con src principal y fallback automático vía onerror.
       Se incluye referrerpolicy="no-referrer" para evitar limitaciones
       por Referer en los CDN de sprites. */
    function imgFallback(src, fallback, alt, cls) {
        return '<img src="' + src + '" alt="' + U.esc(alt || '') + '" loading="lazy" ' +
            'referrerpolicy="no-referrer" data-fb="' + fallback + '" ' +
            'onerror="this.onerror=null;if(this.getAttribute(\'data-fb\')){this.src=this.getAttribute(\'data-fb\');this.removeAttribute(\'data-fb\');}"' +
            (cls ? ' class="' + cls + '"' : '') + '>';
    }
    /* Sprite de un Pokémon: raw.githubusercontent y, si falla, CDN de pokemon.com */
    function pokeImg(id, alt, cls) {
        var pad = ('000' + id).slice(-3);
        return imgFallback(C.SPRITE + id + '.png', C.POKE_CDN + pad + '.png', alt, cls);
    }

    /* ---------- Tarjeta de Pokémon ---------- */
    function card(poke, opts) {
        opts = opts || {};
        var types = (opts.types && poke.types) ? poke.types : null;
        var extra = opts.compact ? ' compact' : '';
        var star = opts.star ? favButton(poke.id) : '';
        var favClass = store.isFav(poke.id) ? ' faved' : '';
        var typesHtml = types ? '<div class="poke-types">' + types.map(function (t) {
            return U.typeChip(t);
        }).join('') + '</div>' : '';
        var badge = opts.badges && (poke.legendary || poke.mythical)
            ? '<span class="mini-badge">' + (poke.legendary ? 'Legendario' : 'Mítico') + '</span>'
            : '';
        return '<a class="poke-card' + extra + favClass + '" href="#/pokemon/' + poke.id + '" title="' + U.cap(poke.name) + '">' +
            '<span class="poke-num">#' + U.pad4(poke.id) + '</span>' +
            pokeImg(poke.id, poke.name) +
            '<h3 class="poke-name">' + U.cap(poke.name) + '</h3>' +
            badge + typesHtml +
            (opts.star ? star : '') +
            '</a>';
    }

    function favButton(id) {
        return '<button class="fav-btn' + (store.isFav(id) ? ' faved' : '') + '" data-fav="' + id +
            '" title="Marcar como favorito" aria-label="Marcar como favorito">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 17.3l-6.2 3.7 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.7 7.1.6-5.4 4.7 1.6 7z" fill="currentColor"/></svg>' +
            '</button>';
    }

    /* ---------- Barras de estadísticas ---------- */
    function statBars(stats, opts) {
        opts = opts || {};
        var order = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
        var rows = order.map(function (key) {
            var val = stats[key] || 0;
            var pct = Math.min(100, val);
            var label = PW.statEs[key] || key;
            return '<div class="stat-row">' +
                '<span class="stat-label">' + U.esc(label) + '</span>' +
                '<span class="stat-value">' + val + '</span>' +
                '<div class="stat-bar"><div class="stat-fill" style="width:' + pct + '%"></div></div>' +
                '</div>';
        });
        var total = opts.total != null ? opts.total
            : order.reduce(function (sum, k) { return sum + (stats[k] || 0); }, 0);
        rows.push('<div class="stat-row stat-total">' +
            '<span class="stat-label">Total</span>' +
            '<span class="stat-value">' + total + '</span>' +
            '<div class="stat-bar"><div class="stat-fill" style="width:' + Math.min(100, total) + '%"></div></div>' +
            '</div>');
        return rows.join('');
    }

    /* ---------- Análisis de tipos (débil/resiste/inmune) ---------- */
    function multLabel(m) {
        if (m === 0) return 'x0';
        if (m === 0.25) return 'x1/4';
        if (m === 0.5) return 'x1/2';
        if (m === 1) return 'x1';
        return 'x' + m;
    }
    function analysisGroup(analysis) {
        function chipBlock(label, items, cls) {
            if (!items.length) return '';
            return '<div class="ana-block ' + cls + '">' +
                '<span class="ana-label">' + label + '</span>' +
                '<span class="ana-chips">' + items.map(function (it) {
                    return '<span class="ana-chip">' + U.typeChip(it.t) +
                        '<small>' + multLabel(it.m) + '</small></span>';
                }).join('') + '</span></div>';
        }
        return chipBlock('Débil contra', analysis.weak, 'ana-weak') +
            chipBlock('Resiste', analysis.resist, 'ana-resist') +
            chipBlock('Inmune', analysis.immune, 'ana-immune');
    }

    /* ---------- Chips simples ---------- */
    function chips(items, cls) {
        return '<div class="chip-line' + (cls ? ' ' + cls : '') + '">' +
            items.map(function (x) {
                return '<span class="chip">' + U.esc(x) + '</span>';
            }).join('') + '</div>';
    }

    /* ---------- Barra de progreso ---------- */
    function progressBar(container, state) {
        container.innerHTML = '<div class="mini-progress"><div class="mini-progress-track">' +
            '<div class="mini-progress-fill" style="width:' + Math.round(state.done / state.total * 100) + '%"></div>' +
            '</div><span class="mini-progress-text">' + U.esc(state.msg || 'Cargando datos...') + '</span></div>';
    }

    /* ---------- Toast ---------- */
    var toastEl = null;
    var toastTimer = null;
    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'toast';
            toastEl.setAttribute('role', 'status');
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
    }

    /* ---------- Tema claro/oscuro ---------- */
    function applyTheme(theme) {
        var html = document.documentElement;
        if (!theme) {
            theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark' : 'light';
        }
        html.setAttribute('data-theme', theme);
        store.setTheme(theme === 'dark' ? 'dark' : 'light');
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.innerHTML = theme === 'dark'
                ? '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5c.6 0 1 .4 1 1v2a1 1 0 1 1-2 0V3c0-.6.4-1 1-1zm0 16c.6 0 1 .4 1 1v2a1 1 0 1 1-2 0v-2c0-.6.4-1 1-1zM4.2 4.2a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 1 1-1.4 1.4L4.2 5.6a1 1 0 0 1 0-1.4zm12.8 12.8a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1-1.4 1.4l-1.4-1.4a1 1 0 0 1 0-1.4zM2 12c0-.6.4-1 1-1h2a1 1 0 1 1 0 2H3c-.6 0-1-.4-1-1zm16 0c0-.6.4-1 1-1h2a1 1 0 1 1 0 2h-2c-.6 0-1-.4-1-1zM4.2 19.8a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 1 1 1.4 1.4l-1.4 1.4a1 1 0 0 1-1.4 0zm12.8-12.8a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 1.4l-1.4 1.4a1 1 0 0 1-1.4 0z" fill="currentColor"/></svg>'
                : '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="currentColor"/></svg>';
            btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
        }
    }
    function initTheme() {
        var saved = store.getTheme();
        applyTheme(saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    }

    /* ---------- Botón volver arriba ---------- */
    function initBackToTop() {
        var btn = document.getElementById('backToTop');
        if (!btn) return;
        window.addEventListener('scroll', function () {
            btn.classList.toggle('show', window.scrollY > 400);
        });
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    return {
        loader: loader,
        empty: empty,
        error: error,
        card: card,
        imgFallback: imgFallback,
        pokeImg: pokeImg,
        favButton: favButton,
        statBars: statBars,
        analysisGroup: analysisGroup,
        chips: chips,
        progressBar: progressBar,
        toast: toast,
        applyTheme: applyTheme,
        initTheme: initTheme,
        initBackToTop: initBackToTop
    };
})();
