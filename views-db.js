/* =========================================================================
   Pokepedia — Base de datos: Movimientos, Habilidades, Objetos y Bayas
   ========================================================================= */

(function () {
    'use strict';

    var C = PW.config;
    var U = PW.utils;
    var api = PW.api;
    var ui = PW.ui;

    var PAGE = 24;
    var GENERATIONS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].map(function (label, i) {
        return {
            value: 'generation-' + ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'][i],
            label: 'Generación ' + label
        };
    });

    /* Lista paginada genérica con detalles cargados perezosamente.
       Filtros y ordenación que requieren el detalle cargan todos los
       registros en segundo plano (con progreso) la primera vez que se usan. */
    function dbView(container, cfg) {
        var st = { q: '', shown: 0, names: [], sort: cfg.defaultSort || 'name', dir: 'asc', filters: {} };
        var detailCache = {};
        var allPromise = null;
        var busy = false;

        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">' + U.esc(cfg.title) + '</h1>' +
                '<p class="subtitle">' + U.esc(cfg.subtitle) + '</p>' +
            '</div>' +
            '<div class="dex-actions"><span class="view-info" id="dbInfo"></span>' +
                '<button type="button" class="btn-primary" id="dbMore">Cargar más</button></div>' +
            '</header>' +
            '<div class="filterbar">' +
                '<div class="filterbar-row">' +
                    '<label class="fgroup fsearch"><span>Buscar</span>' +
                        '<input type="search" id="dbSearch" placeholder="' + U.esc(cfg.placeholder) + '" autocomplete="off"></label>' +
                    (cfg.sortFields && cfg.sortFields.length
                        ? '<label class="fgroup"><span>Ordenar por</span><select data-fb="sort">' +
                            cfg.sortFields.map(function (o) {
                                return '<option value="' + U.esc(o.value) + '"' + (o.value === st.sort ? ' selected' : '') + '>' +
                                    U.esc(o.label) + '</option>';
                            }).join('') + '</select></label>' +
                          '<label class="fgroup"><span>Orden</span><select data-fb="dir">' +
                            '<option value="asc" selected>Ascendente</option>' +
                            '<option value="desc">Descendente</option>' +
                          '</select></label>'
                        : '') +
                    '<button type="button" class="btn-secondary" id="dbReset">Reiniciar filtros</button>' +
                '</div>' +
                (cfg.filters && cfg.filters.length
                    ? '<div class="filterbar-row">' + cfg.filters.map(function (f) {
                        return '<label class="fgroup"><span>' + U.esc(f.label) + '</span><select data-fb="' + U.esc(f.id) + '">' +
                            '<option value="">Todas</option>' +
                            f.options.map(function (o) {
                                return '<option value="' + U.esc(o.value) + '">' + U.esc(o.label) + '</option>';
                            }).join('') + '</select></label>';
                    }).join('') + '</div>'
                    : '') +
                '<div class="filterbar-row"><span class="filter-status" id="dbStatus"></span></div>' +
            '</div>' +
            '<div class="db-grid" id="dbGrid"><div class="loader">Cargando lista...</div></div>';

        var grid = container.querySelector('#dbGrid');
        var info = container.querySelector('#dbInfo');
        var status = container.querySelector('#dbStatus');
        var search = container.querySelector('#dbSearch');
        var moreBtn = container.querySelector('#dbMore');
        moreBtn.addEventListener('click', renderMore);

        function activeFilterCount() {
            var n = 0;
            for (var k in st.filters) if (st.filters[k]) n++;
            return n;
        }

        function needsDetails() {
            return activeFilterCount() > 0 || (st.sort && st.sort !== 'name');
        }

        /* Carga todos los detalles en segundo plano para habilitar filtros */
        function ensureAll() {
            if (allPromise) return allPromise;
            var missing = st.names.filter(function (n) { return !detailCache[n.name]; });
            if (!missing.length) { allPromise = Promise.resolve(); return allPromise; }
            var fetched = 0, total = missing.length;
            if (status) status.textContent = 'Preparando filtros (0/' + total + ')...';
            allPromise = api.runPool(missing, 8, function (it) {
                return api.get(cfg.detailUrl(it.name)).then(function (d) {
                    detailCache[it.name] = d;
                    fetched++;
                    if (status) status.textContent = 'Preparando filtros (' + fetched + '/' + total + ')...';
                    return d;
                }, function () {
                    fetched++;
                    if (status) status.textContent = 'Preparando filtros (' + fetched + '/' + total + ')...';
                    return null;
                });
            }).then(function () {
                if (status) status.textContent = '';
            });
            return allPromise;
        }

        function visible() {
            var q = st.q.toLowerCase();
            var needD = needsDetails();
            var list = st.names.filter(function (n) {
                if (q && n.name.indexOf(q) === -1) return false;
                if (needD) {
                    var d = detailCache[n.name];
                    if (!d) return false;
                    return (cfg.filters || []).every(function (f) {
                        var v = st.filters[f.id];
                        if (!v) return true;
                        return f.test(d, v);
                    });
                }
                return true;
            });
            if (needD && st.sort && st.sort !== 'name') {
                var sf = (cfg.sortFields || []).filter(function (s) { return s.value === st.sort; })[0];
                if (sf) {
                    list.sort(function (a, b) {
                        var va = detailCache[a.name] ? sf.get(detailCache[a.name]) : null;
                        var vb = detailCache[b.name] ? sf.get(detailCache[b.name]) : null;
                        var na = va == null ? Infinity : va;
                        var nb = vb == null ? Infinity : vb;
                        if (na !== nb) return na - nb;
                        return a.name.localeCompare(b.name);
                    });
                } else {
                    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
                }
            } else {
                list.sort(function (a, b) { return a.name.localeCompare(b.name); });
            }
            if (st.dir === 'desc') list.reverse();
            return list;
        }

        function updateFooter(total) {
            info.textContent = st.shown >= total
                ? 'Mostrando ' + total + ' de ' + total + ' ' + cfg.countNoun + '.'
                : 'Mostrando ' + st.shown + ' de ' + total;
            moreBtn.hidden = st.shown >= total;
        }

        function renderMore() {
            if (busy) return;
            busy = true;
            var ready = function () {
                var list = visible();
                var batch = list.slice(st.shown, st.shown + PAGE);
                if (!batch.length) {
                    if (st.shown === 0) grid.innerHTML = ui.empty(cfg.emptyMsg);
                    updateFooter(list.length);
                    busy = false;
                    return;
                }
                moreBtn.disabled = true;
                moreBtn.textContent = 'Cargando...';
                status.textContent = 'Obteniendo detalles (' + st.shown + '…' + (st.shown + batch.length) + ')...';
                api.runPool(batch, 6, function (it) {
                    return api.get(cfg.detailUrl(it.name)).then(function (d) {
                        detailCache[it.name] = d;
                        if (cfg.enrich) {
                            return cfg.enrich(d).then(function (extra) {
                                return { d: d, extra: extra };
                            }, function () { return { d: d, extra: null }; });
                        }
                        return { d: d, extra: null };
                    });
                }).then(function (results) {
                    grid.insertAdjacentHTML('beforeend', results.map(function (r) {
                        return r && r.d ? cfg.renderItem(r.d, r.extra) : '';
                    }).join(''));
                    st.shown += batch.length;
                    moreBtn.disabled = false;
                    moreBtn.textContent = 'Cargar más';
                    status.textContent = '';
                    busy = false;
                    updateFooter(visible().length);
                }).catch(function () {
                    moreBtn.disabled = false;
                    moreBtn.textContent = 'Cargar más';
                    status.textContent = 'No se pudieron cargar algunos detalles.';
                    busy = false;
                    updateFooter(visible().length);
                });
            };
            if (needsDetails()) {
                status.textContent = 'Preparando filtros...';
                ensureAll().then(ready);
            } else {
                ready();
            }
        }

        api.getList(cfg.key).then(function (names) {
            st.names = names;
            if (names.length) {
                grid.innerHTML = '';
                renderMore();
            } else {
                grid.innerHTML = ui.empty('Lista vacía.');
            }
        }).catch(function () {
            grid.innerHTML = ui.error('No se pudo conectar con la PokéAPI.', 'dbRetry');
            var rb = container.querySelector('#dbRetry');
            if (rb) rb.addEventListener('click', function () { location.hash = location.hash; });
        });

        search.addEventListener('input', U.debounce(function () {
            st.q = this.value;
            st.shown = 0;
            grid.innerHTML = '<div class="loader">Buscando...</div>';
            renderMore();
        }, 220));

        container.querySelectorAll('[data-fb]').forEach(function (el) {
            el.addEventListener('change', function () {
                var f = el.getAttribute('data-fb');
                if (f === 'sort') st.sort = el.value;
                else if (f === 'dir') st.dir = el.value;
                else st.filters[f] = el.value;
                st.shown = 0;
                grid.innerHTML = '<div class="loader">Filtrando...</div>';
                renderMore();
            });
        });

        container.querySelector('#dbReset').addEventListener('click', function () {
            st.q = '';
            st.filters = {};
            st.sort = cfg.defaultSort || 'name';
            st.dir = 'asc';
            search.value = '';
            container.querySelectorAll('[data-fb]').forEach(function (el) {
                el.value = el.getAttribute('data-fb') === 'sort' ? st.sort : (el.getAttribute('data-fb') === 'dir' ? 'asc' : '');
            });
            st.shown = 0;
            grid.innerHTML = '<div class="loader">Cargando...</div>';
            renderMore();
        });
    }

    /* ---------------- Movimientos ---------------- */

    PW.views.moves = function (container) {
        dbView(container, {
            key: 'moves',
            title: 'Movimientos',
            subtitle: 'Base de datos de ataques de todos los Pokémon',
            placeholder: 'Buscar movimiento por nombre...',
            emptyMsg: 'No se encontraron movimientos.',
            countNoun: 'movimientos',
            defaultSort: 'name',
            filters: [
                {
                    id: 'type', label: 'Tipo',
                    options: PW.types.map(function (t) { return { value: t, label: PW.typeEs[t] }; }),
                    test: function (d, v) { return d.type && d.type.name === v; }
                },
                {
                    id: 'cat', label: 'Categoría',
                    options: [
                        { value: 'physical', label: 'Físico' },
                        { value: 'special', label: 'Especial' },
                        { value: 'status', label: 'Estado' }
                    ],
                    test: function (d, v) { return d.damage_class && d.damage_class.name === v; }
                }
            ],
            sortFields: [
                { value: 'name', label: 'Nombre', get: function () { return null; } },
                { value: 'power', label: 'Potencia', get: function (d) { return d.power; } },
                { value: 'accuracy', label: 'Precisión', get: function (d) { return d.accuracy; } },
                { value: 'pp', label: 'PP', get: function (d) { return d.pp; } }
            ],
            detailUrl: function (name) { return C.API + 'move/' + name; },
            renderItem: function (m) {
                var name = U.findLocalized(m.names, 'name') || m.name;
                var type = m.type ? m.type.name : null;
                var cat = m.damage_class ? m.damage_class.name : null;
                var meta = '';
                if (type) meta += U.typeChip(type);
                if (cat) meta += '<span class="chip">' + (PW.categoryEs[cat] || U.cap(cat)) + '</span>';
                if (m.power != null) meta += '<span class="chip">Pot. ' + m.power + '</span>';
                if (m.accuracy != null) meta += '<span class="chip">Prec. ' + m.accuracy + '</span>';
                if (m.pp != null) meta += '<span class="chip">PP ' + m.pp + '</span>';
                return '<a class="db-card" href="#/move/' + m.name + '">' +
                    '<span class="db-main">' + U.cap(name) + '</span>' +
                    (meta ? '<span class="db-meta">' + meta + '</span>' : '') +
                    '</a>';
            }
        });
    };

    PW.views.move = async function (container, ctx) {
        var name = ctx.params.name;
        container.innerHTML = ui.loader('Cargando movimiento...');
        var m;
        try { m = await api.get(C.API + 'move/' + name); } catch (e) {
            container.innerHTML = ui.error('No se pudo cargar el movimiento.');
            return;
        }
        var esName = U.findLocalized(m.names, 'name');
        var effect = U.findLocalized(m.effect_entries, 'effect') || U.findLocalized(m.effect_entries, 'short_effect');
        var flavor = U.findLocalized(m.flavor_text_entries, 'flavor_text');
        var genNum = U.genFromUrl(m.generation ? m.generation.url : '');
        var type = m.type ? m.type.name : null;
        var cat = m.damage_class ? m.damage_class.name : null;

        var learners = (m.learned_by_pokemon || []);
        var learnersHtml = learners.length
            ? '<div class="mini-grid">' + learners.slice(0, 24).map(function (p) {
                var pid = U.idFromUrl(p.url);
                return ui.card({ id: pid, name: p.name }, { compact: true });
            }).join('') + '</div>' +
              (learners.length > 24 ? '<p class="hint">Y ' + (learners.length - 24) + ' Pokémon más.</p>' : '')
            : ui.empty('Ningún Pokémon aprende este movimiento por nivel.');

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/moves">Movimientos</a> › <span>' + U.esc(esName || U.cap(m.name)) + '</span></nav>' +
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">' + U.esc(esName || U.cap(m.name)) + '</h1>' +
                (esName && esName.toLowerCase() !== m.name ? '<p class="subtitle">' + U.cap(m.name) + '</p>' : '<p class="subtitle">' + U.esc(U.genLabel(genNum)) + '</p>') +
            '</div></header>' +
            '<div class="badge-row">' +
                (type ? U.typeChip(type, 'type-chip-lg') : '') +
                (cat ? '<span class="chip chip-lg">' + (PW.categoryEs[cat] || U.cap(cat)) + '</span>' : '') +
            '</div>' +
            '<div class="dl-grid">' +
                '<dt>Potencia</dt><dd>' + (m.power != null ? m.power : '—') + '</dd>' +
                '<dt>Precisión</dt><dd>' + (m.accuracy != null ? m.accuracy + '%' : '—') + '</dd>' +
                '<dt>PP</dt><dd>' + (m.pp != null ? m.pp : '—') + '</dd>' +
                '<dt>Prioridad</dt><dd>' + (m.priority || 0) + '</dd>' +
                '<dt>Generación</dt><dd>' + U.esc(U.genLabel(genNum)) + '</dd>' +
                (m.target && m.target.name
                    ? '<dt>Alcance</dt><dd>' + U.esc(PW.dicts.moveTargets[m.target.name] || U.cap(m.target.name.replace(/-/g, ' '))) + '</dd>'
                    : '') +
            '</div>' +
            (effect ? '<div class="panel"><h3>Efecto</h3><p class="effect-text">' + U.esc(effect.replace(/[\f\n\r$]+/g, ' ').replace(/\s+/g, ' ')) + '</p></div>' : '') +
            (flavor ? '<div class="panel"><h3>Descripción</h3><p class="effect-text">' + U.esc(flavor.replace(/[\f\n\r]+/g, ' ')) + '</p></div>' : '') +
            '<div class="home-panel"><h3>Pokémon que lo aprenden (' + learners.length + ')</h3>' + learnersHtml + '</div>';
    };

    /* ---------------- Habilidades ---------------- */

    PW.views.abilities = function (container) {
        dbView(container, {
            key: 'abilities',
            title: 'Habilidades',
            subtitle: 'Base de datos de habilidades de todos los Pokémon',
            placeholder: 'Buscar habilidad por nombre...',
            emptyMsg: 'No se encontraron habilidades.',
            countNoun: 'habilidades',
            defaultSort: 'name',
            filters: [
                {
                    id: 'gen', label: 'Generación',
                    options: GENERATIONS,
                    test: function (d, v) { return d.generation && d.generation.name === v; }
                }
            ],
            sortFields: [
                { value: 'name', label: 'Nombre', get: function () { return null; } }
            ],
            detailUrl: function (name) { return C.API + 'ability/' + name; },
            renderItem: function (a) {
                var name = U.findLocalized(a.names, 'name') || a.name;
                var flavor = U.findLocalized(a.flavor_text_entries, 'flavor_text');
                return '<a class="db-card" href="#/ability/' + a.name + '">' +
                    '<span class="db-main">' + U.cap(name) + '</span>' +
                    (flavor ? '<span class="db-sub">' + U.esc(flavor.replace(/[\f\n\r]+/g, ' ').slice(0, 120)) + '…</span>' : '') +
                    '</a>';
            }
        });
    };

    PW.views.ability = async function (container, ctx) {
        var name = ctx.params.name;
        container.innerHTML = ui.loader('Cargando habilidad...');
        var a;
        try { a = await api.get(C.API + 'ability/' + name); } catch (e) {
            container.innerHTML = ui.error('No se pudo cargar la habilidad.');
            return;
        }
        var esName = U.findLocalized(a.names, 'name');
        var effect = U.findLocalized(a.effect_entries, 'effect') || U.findLocalized(a.effect_entries, 'short_effect');
        var flavor = U.findLocalized(a.flavor_text_entries, 'flavor_text');
        var genNum = U.genFromUrl(a.generation ? a.generation.url : '');

        var holders = (a.pokemon || []);
        var holdersHtml = holders.length
            ? '<div class="mini-grid">' + holders.slice(0, 30).map(function (p) {
                var pid = U.idFromUrl(p.pokemon.url);
                var hiddenBadge = p.is_hidden ? ' <em class="hidden-ab">(oculta)</em>' : '';
                return '<a class="poke-card compact" href="#/pokemon/' + pid + '">' +
                    '<span class="poke-num">#' + U.pad4(pid) + '</span>' +
                    ui.pokeImg(pid, '') +
                    '<span class="poke-name">' + U.cap(p.pokemon.name) + hiddenBadge + '</span>' +
                    '</a>';
            }).join('') + '</div>' +
              (holders.length > 30 ? '<p class="hint">Y ' + (holders.length - 30) + ' Pokémon más.</p>' : '')
            : ui.empty('Ningún Pokémon conocido con esta habilidad.');

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/abilities">Habilidades</a> › <span>' + U.esc(esName || U.cap(a.name)) + '</span></nav>' +
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">' + U.esc(esName || U.cap(a.name)) + '</h1>' +
                '<p class="subtitle">' + U.esc(U.genLabel(genNum)) + '</p>' +
            '</div></header>' +
            (effect ? '<div class="panel"><h3>Efecto</h3><p class="effect-text">' + U.esc(effect.replace(/[\f\n\r$]+/g, ' ').replace(/\s+/g, ' ')) + '</p></div>' : '') +
            (flavor ? '<div class="panel"><h3>Descripción</h3><p class="effect-text">' + U.esc(flavor.replace(/[\f\n\r]+/g, ' ')) + '</p></div>' : '') +
            '<div class="home-panel"><h3>Pokémon que la poseen (' + holders.length + ')</h3>' + holdersHtml + '</div>';
    };

    /* ---------------- Objetos ---------------- */

    PW.views.items = function (container) {
        dbView(container, {
            key: 'items',
            title: 'Objetos',
            subtitle: 'Poké Balls, medicina, piedras evolutivas y mucho más',
            placeholder: 'Buscar objeto por nombre...',
            emptyMsg: 'No se encontraron objetos.',
            countNoun: 'objetos',
            defaultSort: 'name',
            filters: [
                {
                    id: 'cat', label: 'Categoría',
                    options: Object.keys(PW.dicts.itemCategories).map(function (k) {
                        return { value: k, label: PW.dicts.itemCategories[k] };
                    }).sort(function (a, b) { return a.label.localeCompare(b.label); }),
                    test: function (d, v) { return d.category && d.category.name === v; }
                }
            ],
            sortFields: [
                { value: 'name', label: 'Nombre', get: function () { return null; } },
                { value: 'cost', label: 'Coste', get: function (d) { return d.cost; } }
            ],
            detailUrl: function (name) { return C.API + 'item/' + name; },
            renderItem: function (it) {
                var name = U.findLocalized(it.names, 'name') || it.name;
                var sprite = it.sprites && it.sprites.default;
                var cat = it.category
                    ? (PW.dicts.itemCategories[it.category.name] || U.cap(it.category.name.replace(/-/g, ' ')))
                    : '';
                var cost = it.cost;
                return '<a class="db-card db-item" href="#/item/' + it.name + '">' +
                    (sprite ? '<img class="db-thumb" src="' + sprite + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="db-thumb"></span>') +
                    '<span class="db-main">' + U.cap(name) + '</span>' +
                    '<span class="db-meta">' +
                        (cat ? '<span class="chip">' + U.esc(cat) + '</span>' : '') +
                        (cost ? '<span class="chip">' + cost + ' ₽</span>' : '') +
                    '</span></a>';
            }
        });
    };

    PW.views.item = async function (container, ctx) {
        var name = ctx.params.name;
        container.innerHTML = ui.loader('Cargando objeto...');
        var it;
        try { it = await api.get(C.API + 'item/' + name); } catch (e) {
            container.innerHTML = ui.error('No se pudo cargar el objeto.');
            return;
        }
        var esName = U.findLocalized(it.names, 'name');
        var effect = U.findLocalized(it.effect_entries, 'effect') || U.findLocalized(it.effect_entries, 'short_effect');
        var flavor = U.findLocalized(it.flavor_text_entries, 'text');
        var cat = it.category
            ? (PW.dicts.itemCategories[it.category.name] || U.cap(it.category.name.replace(/-/g, ' ')))
            : '';
        var sprite = it.sprites && it.sprites.default;

        var holders = (it.held_by_pokemon || []);
        var holdersHtml = holders.length
            ? '<div class="mini-grid">' + holders.slice(0, 24).map(function (p) {
                var pid = U.idFromUrl(p.pokemon.url);
                return ui.card({ id: pid, name: p.pokemon.name }, { compact: true });
            }).join('') + '</div>' +
              (holders.length > 24 ? '<p class="hint">Y ' + (holders.length - 24) + ' más.</p>' : '')
            : '';

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/items">Objetos</a> › <span>' + U.esc(esName || U.cap(it.name)) + '</span></nav>' +
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">' + U.esc(esName || U.cap(it.name)) + '</h1>' +
                (esName && esName.toLowerCase() !== it.name ? '<p class="subtitle">' + U.cap(it.name) + '</p>' : '') +
            '</div></header>' +
            '<div class="item-hero">' +
                (sprite ? '<img src="' + sprite + '" alt="' + U.esc(it.name) + '" referrerpolicy="no-referrer">' : '<span class="db-thumb"></span>') +
                '<div>' +
                    '<div class="badge-row"><span class="chip chip-lg">' + U.esc(cat) + '</span>' +
                    (it.cost ? '<span class="chip chip-lg">' + it.cost + ' ₽</span>' : '') + '</div>' +
                    (effect ? '<p class="effect-text">' + U.esc(effect.replace(/[\f\n\r$]+/g, ' ').replace(/\s+/g, ' ')) + '</p>' : '') +
                '</div>' +
            '</div>' +
            (flavor ? '<div class="panel"><h3>Descripción</h3><p class="effect-text">' + U.esc(flavor.replace(/[\f\n\r]+/g, ' ')) + '</p></div>' : '') +
            (holdersHtml ? '<div class="home-panel"><h3>Pokémon salvajes que lo pueden llevar</h3>' + holdersHtml + '</div>' : '');
    };

    /* ---------------- Bayas ---------------- */

    PW.views.berries = function (container) {
        dbView(container, {
            key: 'berries',
            title: 'Bayas',
            subtitle: 'Las bayas del mundo Pokémon, sus efectos y dónde conseguirlas',
            placeholder: 'Buscar baya por nombre...',
            emptyMsg: 'No se encontraron bayas.',
            countNoun: 'bayas',
            defaultSort: 'name',
            filters: [
                {
                    id: 'firm', label: 'Dureza',
                    options: Object.keys(PW.dicts.firmness).map(function (k) {
                        return { value: k, label: PW.dicts.firmness[k] };
                    }),
                    test: function (d, v) { return d.firmness && d.firmness.name === v; }
                }
            ],
            sortFields: [
                { value: 'name', label: 'Nombre', get: function () { return null; } },
                { value: 'growth', label: 'Crecimiento', get: function (d) { return d.growth_time; } }
            ],
            detailUrl: function (name) { return C.API + 'berry/' + name; },
            enrich: function (b) {
                return api.get(b.item.url).then(function (itemDetail) {
                    return {
                        esName: U.findLocalized(itemDetail.names, 'name') || null,
                        sprite: (itemDetail.sprites && itemDetail.sprites.default) || (C.ITEMS_SPRITE + b.name + '.png')
                    };
                }, function () {
                    return { esName: null, sprite: C.ITEMS_SPRITE + b.name + '.png' };
                });
            },
            renderItem: function (b, extra) {
                var name = (extra && extra.esName) || U.cap(b.name.replace(/-/g, ' '));
                var firm = (b.firmness && PW.dicts.firmness[b.firmness.name]) ||
                    (b.firmness ? U.cap(b.firmness.name.replace(/-/g, ' ')) : '');
                var loc = PW.berryLoc[b.name];
                var where = loc && loc.regions && loc.regions.length
                    ? '<span class="db-sub">Se encuentra en: ' + U.esc(loc.regions.join(', ')) + '</span>'
                    : '';
                return '<a class="db-card db-item" href="#/berry/' + b.name + '">' +
                    (extra && extra.sprite
                        ? '<img class="db-thumb" src="' + extra.sprite + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
                        : '<span class="db-thumb"></span>') +
                    '<span class="db-main">' + U.cap(name) + '</span>' +
                    where +
                    '<span class="db-meta">' +
                        (firm ? '<span class="chip">' + U.esc(firm) + '</span>' : '') +
                        '<span class="chip">Crec. ' + b.growth_time + 'h</span>' +
                    '</span></a>';
            }
        });
    };

    PW.views.berry = async function (container, ctx) {
        var name = ctx.params.name;
        container.innerHTML = ui.loader('Cargando baya...');
        var b, itemDetail;
        try {
            b = await api.get(C.API + 'berry/' + name);
            itemDetail = await api.get(b.item.url);
        } catch (e) {
            container.innerHTML = ui.error('No se pudo cargar la baya.');
            return;
        }
        var esName = U.findLocalized(itemDetail.names, 'name');
        var effect = U.findLocalized(itemDetail.effect_entries, 'short_effect') || U.findLocalized(itemDetail.effect_entries, 'effect');
        var firm = (b.firmness && PW.dicts.firmness[b.firmness.name]) ||
            (b.firmness ? U.cap(b.firmness.name.replace(/-/g, ' ')) : '');
        var sprite = (itemDetail.sprites && itemDetail.sprites.default) || (C.ITEMS_SPRITE + b.name + '.png');
        var loc = PW.berryLoc[b.name];
        var locHtml = loc
            ? '<div class="home-panel"><h3>Dónde conseguirlo</h3>' +
                '<p class="effect-text">' + U.esc(loc.how) + '</p>' +
                '<div class="chip-line">' + loc.regions.map(function (r) {
                    return '<span class="chip">' + U.esc(r) + '</span>';
                }).join('') + '</div>' +
                (C.REGION_MAPS[loc.regions[0]]
                    ? '<div class="region-map"><img src="' + C.REGION_MAPS[loc.regions[0]] + '" alt="Mapa de ' + U.esc(loc.regions[0]) + '" loading="lazy" referrerpolicy="no-referrer"></div>'
                    : '') +
            '</div>'
            : '';

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/berries">Bayas</a> › <span>' + U.esc(esName || U.cap(b.name)) + '</span></nav>' +
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Baya ' + U.esc(esName || U.cap(b.name)) + '</h1>' +
                (esName && esName.toLowerCase() !== b.name.replace(/-/g, ' ') ? '<p class="subtitle">' + U.cap(b.name.replace(/-/g, ' ')) + '</p>' : '') +
            '</div></header>' +
            '<div class="item-hero">' +
                '<img src="' + sprite + '" alt="' + U.esc(b.name) + '" referrerpolicy="no-referrer">' +
                '<div><div class="badge-row"><span class="chip chip-lg">' + U.esc(firm) + '</span></div>' +
                (effect ? '<p class="effect-text">' + U.esc(effect.replace(/[\f\n\r$]+/g, ' ').replace(/\s+/g, ' ')) + '</p>' : '') +
                '</div></div>' +
            '<div class="dl-grid">' +
                '<dt>Dureza del suelo</dt><dd>' + b.soil_dryness + '</dd>' +
                '<dt>Tiempo de crecimiento</dt><dd>' + b.growth_time + ' h</dd>' +
                '<dt>Cosecha máxima</dt><dd>' + b.max_harvest + '</dd>' +
                '<dt>Tamaño</dt><dd>' + (b.size / 10).toFixed(1).replace('.', ',') + ' cm</dd>' +
                '<dt>Regalo natural</dt><dd>' + U.esc(PW.typeEs[b.natural_gift_type ? b.natural_gift_type.name : '']) + ' · Potencia ' + b.natural_gift_power + '</dd>' +
                (b.smoothness != null ? '<dt>Suavidad</dt><dd>' + b.smoothness + '</dd>' : '') +
            '</div>' +
            (effect ? '<div class="panel"><h3>Efecto</h3><p class="effect-text">' + U.esc(effect.replace(/[\f\n\r$]+/g, ' ').replace(/\s+/g, ' ')) + '</p></div>' : '') +
            '<div class="home-panel"><h3>Sabores</h3>' +
                '<div class="chip-line">' + (b.flavors || []).map(function (f) {
                    return '<span class="chip">' + U.cap(f.flavor.name) + ' +' + f.potency + '</span>';
                }).join('') + '</div></div>' +
            locHtml;
    };
})();
