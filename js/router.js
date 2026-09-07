/* =========================================================================
   Pokepedia — Router por hash: navegación por URLs (#/pokemon/pikachu)
   ========================================================================= */

PW.router = (function () {
    'use strict';

    var routes = [];

    function parse(path) {
        var parts = path.split('/');
        for (var i = 0; i < routes.length; i++) {
            var pattern = routes[i].pattern;
            if (parts.length !== pattern.length) continue;
            var params = {};
            var match = true;
            for (var j = 0; j < parts.length; j++) {
                var pp = pattern[j];
                if (pp.charAt(0) === ':') {
                    params[pp.slice(1)] = decodeURIComponent(parts[j] || '');
                } else if (pp !== parts[j]) {
                    match = false;
                    break;
                }
            }
            if (match) return { handler: routes[i].handler, params: params };
        }
        return null;
    }

    function routePath() {
        var hash = location.hash || '#/';
        if (hash.charAt(0) === '#') hash = hash.slice(1);
        var qi = hash.indexOf('?');
        var path = qi === -1 ? hash : hash.slice(0, qi);
        var query = PW.utils.parseHashQuery(hash);
        if (path === '/' || path === '') path = 'home';
        path = path.replace(/^\/+/, '');
        var m = parse(path);
        return { path: m ? path : 'notfound', route: m, query: query };
    }

    function navigate(hash) {
        if (location.hash === hash) {
            render();
            return;
        }
        location.hash = hash;
    }

    function render() {
        var r = routePath();
        var target = document.getElementById('view');
        if (!target) return;

        /* Destacar enlace activo de la barra lateral */
        var dataPath = (r.route ? r.path : r.path);
        var aliases = { types: ['types', 'type'], regions: ['regions', 'region'] };
        function isActive(nav, path) {
            var list = aliases[nav] ? aliases[nav] : [nav];
            return list.some(function (n) {
                return path === n || path.indexOf(n + '/') === 0;
            });
        }
        document.querySelectorAll('.sidebar a[data-nav]').forEach(function (a) {
            a.classList.toggle('active', isActive(a.getAttribute('data-nav'), dataPath));
        });

        if (r.path === 'notfound' || !r.route) {
            target.innerHTML = PW.ui.empty('Página no encontrada.') +
                '<div class="center"><a class="btn-primary" href="#/">Volver al inicio</a></div>';
            window.scrollTo(0, 0);
            return;
        }
        var ctx = { params: r.route.params, query: r.query, path: r.path };
        var result = r.route.handler(target, ctx);
        if (result && result.then) {
            result.catch(function () {
                if (target) target.innerHTML = PW.ui.error('No se pudo cargar esta sección.');
            });
        }
        window.scrollTo(0, 0);
    }

    function on(pattern, handler) {
        routes.push({ pattern: pattern.split('/'), handler: handler });
    }

    function init() {
        window.addEventListener('hashchange', render);
        render();
    }

    return {
        on: on,
        navigate: navigate,
        render: render,
        init: init,
        routePath: routePath
    };
})();
