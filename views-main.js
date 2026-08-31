/* =========================================================================
   Pokepedia — Vistas principales: inicio, Pokédex, Pokémon, Tipos, Regiones
   ========================================================================= */

PW.views = PW.views || {};

(function () {
    'use strict';

    var C = PW.config;
    var U = PW.utils;
    var api = PW.api;
    var ui = PW.ui;
    var store = PW.store;
    var state = PW.state;

    /* ============================ INICIO ============================ */

    PW.views.home = async function (container) {
        if (!state.all || !state.all.length) {
            await api.getNational().then(function (all) { state.all = all; }).catch(function () {});
        }
        var randomId = 1 + Math.floor(Math.random() * 1025);
        var randomRec = null;
        try { randomRec = await api.getCompact(randomId); } catch (e) {}

        var favs = store.getFavs();
        var favHtml = favs.length
            ? favs.slice(0, 8).map(function (id) {
                return ui.card({ id: id, name: nameOf(id) }, { compact: true, star: false });
            }).join('') || ui.empty('Tus favoritos aparecerán aquí.')
            : '<div class="empty-state">Aún no tienes favoritos. Pulsa la estrella en cualquier Pokémon.</div>';

        var hist = store.getHistory();
        var histHtml = hist.length
            ? hist.map(function (id) {
                return ui.card({ id: id, name: nameOf(id) }, { compact: true });
            }).join('')
            : '<div class="empty-state">Los Pokémon que consultes aparecerán aquí.</div>';

        container.innerHTML =
            '<section class="hero">' +
                '<h1>Pokepedia</h1>' +
                '<p class="hero-sub">La base de datos interactiva de Pokémon. Consulta, compara, construye equipos y aprende todo sobre tus Pokémon favoritos.</p>' +
                '<form id="homeSearch" class="hero-search" role="search">' +
                    '<input type="search" id="homeSearchInput" placeholder="Busca un Pokémon por nombre o número..." autocomplete="off">' +
                    '<button class="btn-primary" type="submit">Buscar</button>' +
                '</form>' +
                '<div class="hero-actions">' +
                    '<a class="btn-primary" href="#/dex">Abrir Pokédex</a>' +
                    '<a class="btn-secondary" href="#/random">Pokémon aleatorio</a>' +
                '</div>' +
            '</section>' +

            '<div class="quick-grid">' +
                '<a class="quick-link" href="#/dex"><span>Pokédex</span><small>Nacional</small></a>' +
                '<a class="quick-link" href="#/types"><span>Tipos</span><small>Matriz y calculadora</small></a>' +
                '<a class="quick-link" href="#/moves"><span>Movimientos</span><small>Base de datos</small></a>' +
                '<a class="quick-link" href="#/abilities"><span>Habilidades</span><small>Base de datos</small></a>' +
                '<a class="quick-link" href="#/items"><span>Objetos</span><small>Y bayas</small></a>' +
                '<a class="quick-link" href="#/teambuilder"><span>Team Builder</span><small>Equipos</small></a>' +
                '<a class="quick-link" href="#/compare"><span>Comparador</span><small>Hasta 6</small></a>' +
                '<a class="quick-link" href="#/rankings"><span>Rankings</span><small>Estadísticas</small></a>' +
                '<a class="quick-link" href="#/regions"><span>Regiones</span><small>Mundo Pokémon</small></a>' +
                '<a class="quick-link" href="#/legendary"><span>Legendarios</span><small>Y míticos</small></a>' +
                '<a class="quick-link" href="#/damage"><span>Calculadora de daño</span><small>Herramienta</small></a>' +
                '<a class="quick-link" href="#/favorites"><span>Favoritos</span><small>Tu lista</small></a>' +
            '</div>' +

            '<div class="home-row">' +
                '<div class="home-panel">' +
                    '<h2>Pokémon aleatorio</h2>' +
                    (randomRec
                        ? '<div class="random-feature">' +
                            ui.imgFallback(C.ART + randomRec.id + '.png', C.POKE_CDN + ('000' + randomRec.id).slice(-3) + '.png', randomRec.name) +
                            '<div class="random-feature-info">' +
                                '<span class="poke-num-big">#' + U.pad4(randomRec.id) + '</span>' +
                                '<h3>' + U.cap(randomRec.name) + '</h3>' +
                                '<div class="badge-row">' + randomRec.types.map(U.typeChip).join('') + '</div>' +
                                '<a class="btn-primary" href="#/pokemon/' + randomRec.id + '">Ver ficha completa</a>' +
                            '</div>' +
                        '</div>'
                        : '<div class="empty-state">No se pudo cargar un Pokémon aleatorio.</div>') +
                '</div>' +
                '<div class="home-panel">' +
                    '<h2>Recientes <a class="mini-link" href="#/history">ver todos</a></h2>' +
                    '<div class="mini-grid">' + histHtml + '</div>' +
                '</div>' +
            '</div>' +

            '<div class="home-panel">' +
                '<h2>Mis favoritos <a class="mini-link" href="#/favorites">ver todos</a></h2>' +
                '<div class="mini-grid">' + favHtml + '</div>' +
            '</div>';

        var form = container.querySelector('#homeSearch');
        var input = container.querySelector('#homeSearchInput');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var term = input.value.trim();
            var id = parseInt(term, 10);
            if (!isNaN(id) && id > 0 && id <= 1025) { PW.router.navigate('#/pokemon/' + id); return; }
            state.dex.q = term;
            state.dex.region = state.dex.region || PW.regions[0];
            PW.router.navigate('#/dex');
        });
    };

    /* ============================ POKÉDEX ============================ */

    function nameOf(id) {
        var all = state.all || [];
        for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].name;
        return '???';
    }

    function regionByName(name) {
        if (PW.regionsAll && PW.regionsAll.name === name) return PW.regionsAll;
        return PW.regions.filter(function (r) { return r.name === name; })[0] || PW.regions[0];
    }

    /* Registro de una región mezclando lista nacional + datos extra */
    function mergedRecords(region) {
        var extra = state.dex.extra || [];
        var map = {};
        extra.forEach(function (r) { map[r.id] = r; });
        var recs = [];
        for (var i = region.start; i <= region.end; i++) {
            var e = map[i];
            if (e) recs.push(e);
            else recs.push({ id: i, name: nameOf(i), types: null, stats: null });
        }
        return recs;
    }

    function needsExtra() {
        var s = state.dex;
        return s.type1 || s.type2 || s.ability || s.egg || s.hidden || s.legendary || s.mythical ||
            s.evo || s.tmin || s.tmax ||
            ['hp', 'attack', 'defense', 'spa', 'spd', 'speed', 'total', 'height', 'weight'].indexOf(s.sort) !== -1;
    }

    var STAT_MAP = { spa: 'special-attack', spd: 'special-defense' };
    function statOf(rec, key) {
        if (key === 'total') return rec.total != null ? rec.total : -Infinity;
        if (key === 'height') return rec.height != null ? rec.height : -Infinity;
        if (key === 'weight') return rec.weight != null ? rec.weight : -Infinity;
        var mapped = STAT_MAP[key] || key;
        return rec.stats ? (rec.stats[mapped] != null ? rec.stats[mapped] : -Infinity) : -Infinity;
    }

    function applyFilters(recs) {
        var s = state.dex;
        var out = recs.filter(function (r) {
            if (s.type1 && r.types && r.types[0] !== s.type1) return false;
            if (s.type2 && r.types && r.types[1] !== s.type2) return false;
            if (s.ability && r.abilities) {
                if (!r.abilities.some(function (a) { return a.name === s.ability; })) return false;
            }
            if (s.egg && r.eggGroups && r.eggGroups.indexOf(s.egg) === -1) return false;
            if (s.hidden && r.abilities && !r.abilities.some(function (a) { return a.hidden; })) return false;
            if (s.legendary && !r.legendary) return false;
            if (s.mythical && !r.mythical) return false;
            if (s.starter && !r.starter) return false;
            if (s.fossil && !r.fossil) return false;
            if (s.evo === 'si' && r.canEvolve != null && !(r.hasPrevo || r.canEvolve)) return false;
            if (s.evo === 'no' && r.canEvolve != null && (r.hasPrevo || r.canEvolve)) return false;
            if (s.tmin && r.total != null && r.total < parseInt(s.tmin, 10)) return false;
            if (s.tmax && r.total != null && r.total > parseInt(s.tmax, 10)) return false;
            return true;
        });
        if (s.sort === 'num') out.sort(function (a, b) { return a.id - b.id; });
        else if (s.sort === 'name') out.sort(function (a, b) { return a.name.localeCompare(b.name); });
        else out.sort(function (a, b) { return statOf(b, s.sort) - statOf(a, s.sort); });
        if (s.dir === 'desc') out.reverse();
        return out;
    }

    var GRID_STAT_KEYS = { hp: 1, attack: 1, defense: 1, spa: 1, spd: 1, speed: 1 };

    function filterBarHtml() {
        var s = state.dex;
        var regionOptions = [PW.regionsAll].concat(PW.regions).map(function (r) {
            return '<option value="' + r.name + '"' + (r.name === s.region.name ? ' selected' : '') + '>' +
                U.esc(r.name) + ' (Gen ' + r.gen + ')</option>';
        }).join('');
        var type1Options = '<option value="">Cualquiera</option>' + PW.types.map(function (t) {
            return '<option value="' + t + '"' + (t === s.type1 ? ' selected' : '') + '>' +
                U.esc(PW.typeEs[t]) + '</option>';
        }).join('');
        var type2Options = '<option value="">Cualquiera</option>' + PW.types.map(function (t) {
            return '<option value="' + t + '"' + (t === s.type2 ? ' selected' : '') + '>' +
                U.esc(PW.typeEs[t]) + '</option>';
        }).join('');
        var abilityOptions = abilityOptionsHtml();
        var eggOptions = eggOptionsHtml();
        var sortOptions = [
            ['num', 'Número'], ['name', 'Nombre'], ['hp', 'PS'], ['attack', 'Ataque'],
            ['defense', 'Defensa'], ['spa', 'Ataque Esp.'], ['spd', 'Defensa Esp.'],
            ['speed', 'Velocidad'], ['total', 'Total'], ['height', 'Altura'], ['weight', 'Peso']
        ].map(function (o) {
            return '<option value="' + o[0] + '"' + (o[0] === s.sort ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('');

        function check(name, val, label) {
            return '<label class="fcheck"><input type="checkbox" data-f="' + name + '"' + (val ? ' checked' : '') + '> ' + label + '</label>';
        }

        return '<div class="filterbar">' +
            '<div class="filterbar-row">' +
                '<label class="fgroup"><span>Región</span><select data-f="region">' + regionOptions + '</select></label>' +
                '<label class="fgroup"><span>Tipo primario</span><select data-f="type1">' + type1Options + '</select></label>' +
                '<label class="fgroup"><span>Tipo secundario</span><select data-f="type2">' + type2Options + '</select></label>' +
                '<label class="fgroup"><span>Ordenar por</span><select data-f="sort">' + sortOptions + '</select></label>' +
                '<label class="fgroup"><span>Orden</span>' +
                    '<select data-f="dir"><option value="asc"' + (s.dir === 'asc' ? ' selected' : '') + '>Ascendente</option>' +
                    '<option value="desc"' + (s.dir === 'desc' ? ' selected' : '') + '>Descendente</option></select></label>' +
                '<div class="fgroup fview">' +
                    '<span>Vista</span>' +
                    '<div class="view-toggle">' +
                        '<button type="button" data-view="grid" class="' + (s.view === 'grid' ? 'on' : '') + '" title="Cuadrícula">' +
                            '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 4h6v6H4zm0 10h6v6H4zm10-10h6v6h-6zm0 10h6v6h-6z" fill="currentColor"/></svg></button>' +
                        '<button type="button" data-view="list" class="' + (s.view === 'list' ? 'on' : '') + '" title="Lista">' +
                            '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 5h16v3H4zm0 5.5h16v3H4zm0 5.5h16v3H4z" fill="currentColor"/></svg></button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="filterbar-row filters-extra">' +
                '<label class="fgroup"><span>Habilidad</span><select data-f="ability">' + abilityOptions + '</select></label>' +
                '<label class="fgroup"><span>Grupo huevo</span><select data-f="egg">' + eggOptions + '</select></label>' +
                '<label class="fgroup fnum"><span>Total mín.</span><input type="number" min="0" max="720" data-f="tmin" value="' + U.esc(s.tmin) + '"></label>' +
                '<label class="fgroup fnum"><span>Total máx.</span><input type="number" min="0" max="720" data-f="tmax" value="' + U.esc(s.tmax) + '"></label>' +
                '<label class="fgroup"><span>Evolución</span>' +
                    '<select data-f="evo"><option value="">Todas</option><option value="si"' + (s.evo === 'si' ? ' selected' : '') + '>Con evolución</option><option value="no"' + (s.evo === 'no' ? ' selected' : '') + '>Sin evolución</option></select></label>' +
            '</div>' +
            '<div class="filterbar-row filter-checks">' +
                check('legendary', s.legendary, 'Legendario') +
                check('mythical', s.mythical, 'Mítico') +
                check('starter', s.starter, 'Inicial') +
                check('fossil', s.fossil, 'Fósil') +
                check('hidden', s.hidden, 'Habilidad oculta') +
                '<button type="button" class="btn-secondary" id="filterReset">Reiniciar filtros</button>' +
                '<span id="filterStatus" class="filter-status"></span>' +
            '</div>' +
        '</div>';
    }

    function abilityOptionsHtml() {
        if (!state.dex.extra) return '<option value="">(cargando…)</option>';
        var names = {};
        state.dex.extra.forEach(function (r) {
            (r.abilities || []).forEach(function (a) { names[a.name] = true; });
        });
        var keys = Object.keys(names).sort();
        return '<option value="">Cualquiera</option>' + keys.map(function (k) {
            return '<option value="' + U.esc(k) + '"' + (state.dex.ability === k ? ' selected' : '') + '>' +
                U.cap(k.replace(/-/g, ' ')) + '</option>';
        }).join('');
    }

    function eggOptionsHtml() {
        if (!state.dex.extra) return '<option value="">(cargando…)</option>';
        var names = {};
        state.dex.extra.forEach(function (r) {
            (r.eggGroups || []).forEach(function (g) { names[g] = true; });
        });
        var keys = Object.keys(names).sort();
        return '<option value="">Cualquiera</option>' + keys.map(function (k) {
            return '<option value="' + U.esc(k) + '"' + (state.dex.egg === k ? ' selected' : '') + '>' +
                U.esc(PW.dicts.eggGroups[k] || U.cap(k.replace(/-/g, ' '))) + '</option>';
        }).join('');
    }

    function renderGrid(container) {
        var gridEl = container.querySelector('#pokedexGrid');
        var footerEl = container.querySelector('#gridFooter');
        var infoEl = container.querySelector('#viewInfo');
        if (!gridEl) return;

        var recs;
        if (state.dex.q) {
            var term = state.dex.q.toLowerCase();
            recs = (state.all || []).filter(function (p) {
                return p.name.indexOf(term) !== -1 || U.pad4(p.id).indexOf(term) !== -1;
            });
            if (state.dex.sort !== 'num' && state.dex.sort !== 'name') state.dex.sort = 'num';
            if (state.dex.sort === 'name') recs.sort(function (a, b) { return a.name.localeCompare(b.name); });
            else recs.sort(function (a, b) { return a.id - b.id; });
            if (state.dex.dir === 'desc') recs.reverse();
        } else {
            recs = applyFilters(mergedRecords(state.dex.region));
        }

        gridEl.classList.toggle('list-view', state.dex.view === 'list');

        if (state.dex.renderedCount === 0 && !recs.length) {
            gridEl.innerHTML = ui.empty('No hay Pokémon que coincidan con los filtros.');
            infoEl.textContent = '0 de 0';
            footerEl.textContent = '';
            var btn0 = container.querySelector('#loadMore');
            if (btn0) btn0.hidden = true;
            return;
        }

        var batch = recs.slice(state.dex.renderedCount, state.dex.renderedCount + C.DEX_BATCH);
        gridEl.innerHTML += batch.map(function (r) {
            var hasTypes = r.types && r.types.length;
            return ui.card(r, { types: hasTypes, compact: false });
        }).join('');

        state.dex.renderedCount += batch.length;

        var total = recs.length;
        infoEl.textContent = 'Mostrando ' + Math.min(state.dex.renderedCount, total) + ' de ' + total;
        var btn = container.querySelector('#loadMore');
        if (state.dex.renderedCount >= total) {
            if (btn) btn.hidden = true;
            footerEl.textContent = state.dex.q
                ? 'Fin de los resultados de búsqueda (' + total + ' Pokémon).'
                : 'Pokédex de ' + state.dex.region.name + ' completa (' + total + ' Pokémon).';        } else {
            if (btn) { btn.hidden = false; btn.disabled = false; }
            footerEl.textContent = '';
        }
    }

    PW.views.dex = async function (container, ctx) {
        var s = state.dex;
        if (ctx.query.q != null) { s.q = ctx.query.q; }
        else { s.q = ''; }
        if (ctx.query.region != null) s.region = regionByName(ctx.query.region);

        if (!state.all || !state.all.length) await api.getNational().then(function (all) { state.all = all; });

        s.renderedCount = 0;

        container.innerHTML =
            '<header class="dex-header">' +
                '<div>' +
                    '<h1 class="page-title">' + (s.q ? 'Resultados de búsqueda' : 'Pokédex de ' + s.region.name) + '</h1>' +
                    '<p class="subtitle">' + (s.q
                        ? 'Buscando: "' + U.esc(s.q) + '" en toda la Pokédex Nacional'
                        : s.region.end - s.region.start + 1 + ' Pokémon · Generación ' + s.region.gen) + '</p>' +
                '</div>' +
                '<div class="dex-actions">' +
                    '<span id="viewInfo" class="view-info"></span>' +
                    '<button id="loadMore" class="btn-primary" hidden>Cargar más</button>' +
                '</div>' +
            '</header>' +
            filterBarHtml() +
            '<div id="pokedexGrid" class="pokedex-grid"><div class="loader">Cargando Pokédex...</div></div>' +
            '<div id="gridFooter" class="grid-footer"></div>';

        var gridWrap = container;

        /* Enlaces de la barra de filtros */
        gridWrap.querySelectorAll('[data-f]').forEach(function (el) {
            el.addEventListener('change', function () {
                var f = el.getAttribute('data-f');
                var v = el.type === 'checkbox' ? el.checked : el.value;
                s[f] = v;
                if (f === 'region') { s.region = regionByName(v); s.extra = null; delete s.ability; delete s.egg; }
                s.renderedCount = 0;
                var gridEl = container.querySelector('#pokedexGrid');
                if (gridEl) gridEl.innerHTML = '<div class="loader">Cargando...</div>';
                maybeLoadExtra(container);
                renderGrid(container);
            });
        });
        var resetBtn = container.querySelector('#filterReset');
        if (resetBtn) resetBtn.addEventListener('click', function () {
            s.type1 = s.type2 = s.ability = s.egg = s.evo = s.tmin = s.tmax = '';
            s.hidden = s.legendary = s.mythical = s.starter = s.fossil = false;
            s.sort = 'num';
            s.dir = 'asc';
            s.renderedCount = 0;
            container.innerHTML = '';
            PW.router.render();
        });
        var loadMoreBtn = container.querySelector('#loadMore');
        if (loadMoreBtn) loadMoreBtn.addEventListener('click', function () { renderGrid(container); });

        container.querySelectorAll('[data-view]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                s.view = btn.getAttribute('data-view');
                container.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('on', b === btn); });
                s.renderedCount = 0;
                var gridEl = container.querySelector('#pokedexGrid');
                if (gridEl) gridEl.innerHTML = '';
                renderGrid(container);
            });
        });

        renderGrid(container);
        maybeLoadExtra(container);
    };

    function maybeLoadExtra(container) {
        var s = state.dex;
        if (s.q) { hideStatus(container); return; }
        if (s.extra && s.extra.length) {
            var need = s.region.end - s.region.start + 1;
            if (s.extra.length === need) { populateExtraSelects(container); hideStatus(container); return; }
        }
        if (!needsExtra() && !(s.extra && s.extra.length)) {
            /* Precarga en segundo plano para habilitar los filtros */
        }
        var statusEl = container.querySelector('#filterStatus');
        if (!statusEl) return;
        statusEl.innerHTML = '<span class="mini-progress-text">Preparando filtros (habilidades, grupos, leyendas…)</span>';

        api.ensureRegionExtra(s.region, function (st) {
            if (statusEl) {
                var pct = Math.round(st.done / st.total * 100);
                statusEl.innerHTML = '<span class="mini-progress"><span class="mini-progress-track"><span class="mini-progress-fill" style="width:' + pct + '%"></span></span>' +
                    '<span class="mini-progress-text">' + (st.phase === 'chains' ? 'Cadenas evolutivas' : 'Datos de la región') + ' ' + st.done + '/' + st.total + '</span></span>';
            }
        }).then(function (recs) {
            s.extra = recs;
            populateExtraSelects(container);
            hideStatus(container);
            s.renderedCount = 0;
            var gridEl = container.querySelector('#pokedexGrid');
            if (gridEl) gridEl.innerHTML = '';
            renderGrid(container);
        }).catch(function () {
            var statusEl2 = container.querySelector('#filterStatus');
            if (statusEl2) statusEl2.textContent = 'No se pudieron cargar los filtros avanzados.';
        });
    }

    function populateExtraSelects(container) {
        var abilitySel = container.querySelector('[data-f="ability"]');
        var eggSel = container.querySelector('[data-f="egg"]');
        if (abilitySel) abilitySel.innerHTML = abilityOptionsHtml();
        if (eggSel) eggSel.innerHTML = eggOptionsHtml();
    }
    function hideStatus(container) {
        var statusEl = container.querySelector('#filterStatus');
        if (statusEl) statusEl.innerHTML = '';
    }

    /* ============================ POKÉMON ============================ */

    function evoMethodText(details) {
        if (!details || !details.length) return 'Intercambio';
        var parts = [];
        details.forEach(function (d) {
            var t = d.trigger ? d.trigger.name : '';
            var item = d.item ? U.cap(d.item.name.replace(/-/g, ' ')) : null;
            if (d.min_level) parts.push('Nv. ' + d.min_level);
            else if (t === 'use-item' && d.item) parts.push('Con ' + item);
            else if (t === 'trade' && d.trade_species) parts.push('Intercambio con ' + U.cap(d.trade_species.name.replace(/-/g, ' ')));
            else if (t === 'trade') parts.push('Intercambio');
            else if (d.held_item) parts.push('Sosteniendo ' + U.cap(d.held_item.name.replace(/-/g, ' ')) + (t === 'trade' ? ' e intercambio' : ''));
            else if (d.known_move) parts.push('Conociendo ' + U.cap(d.known_move.name.replace(/-/g, ' ')));
            else if (d.known_move_type) parts.push('Con un movimiento de tipo ' + U.typeName(d.known_move_type.name));
            else if (d.min_happiness) parts.push('Amistad alta');
            else if (d.min_affection) parts.push('Afecto alto (Amie)');
            else if (d.min_beauty) parts.push('Belleza alta');
            else if (d.location) parts.push('En ' + U.cap(d.location.name.replace(/-/g, ' ')));
            else if (d.time_of_day) parts.push(d.time_of_day === 'day' ? 'De día' : 'De noche');
            else if (d.gender != null) parts.push(d.gender === 1 ? 'Si es hembra' : 'Si es macho');
            else if (d.needs_overworld_rain) parts.push('Con lluvia');
            else if (d.turn_upside_down) parts.push('Dando la vuelta a la consola');
            else if (d.relative_physical_stats === 1) parts.push('Con más Ataque que Defensa');
            else if (d.relative_physical_stats === -1) parts.push('Con más Defensa que Ataque');
            else if (d.party_species) parts.push('Con ' + U.cap(d.party_species.name.replace(/-/g, ' ')) + ' en el equipo');
            else if (d.party_type) parts.push('Con un tipo ' + U.typeName(d.party_type.name) + ' en el equipo');
            else parts.push(PW.dicts.evoTriggers[t] || 'Evolución especial');
        });
        return parts.join(' + ');
    }

    function buildMovesHtml(moves) {
        var map = {};
        moves.forEach(function (m) {
            if (map[m.move.name] !== undefined) return;
            var level = null;
            m.version_group_details.forEach(function (d) {
                if (d.move_learn_method.name === 'level-up' &&
                    (level === null || d.level_learned_at < level)) {
                    level = d.level_learned_at;
                }
            });
            map[m.move.name] = level;
        });
        var names = Object.keys(map);
        if (!names.length) return ui.empty('Este Pokémon no tiene movimientos registrados.');
        names.sort(function (a, b) {
            var la = map[a] === null ? Infinity : map[a];
            var lb = map[b] === null ? Infinity : map[b];
            if (la !== lb) return la - lb;
            return a.localeCompare(b);
        });
        return '<div class="moves-list">' + names.map(function (n) {
            var level = map[n];
            var levelHtml = level !== null
                ? '<span class="move-level">Nv. ' + level + '</span>'
                : '<span class="move-level">Otro método</span>';
            return '<div class="move-row" data-move="' + U.esc(n) + '">' +
                '<span>' + U.cap(n.replace(/-/g, ' ')) + '</span>' + levelHtml + '</div>';
        }).join('') + '</div>';
    }

    /* Sustituye el nombre en inglés de cada movimiento por el español, en
       segundo plano, sin bloquear el render inicial. */
    function localizeMoves(container) {
        var rows = container.querySelectorAll('.move-row[data-move]');
        if (!rows.length) return;
        var seen = {}, names = [];
        rows.forEach(function (r) {
            var n = r.getAttribute('data-move');
            if (!seen[n]) { seen[n] = true; names.push(n); }
        });
        api.runPool(names, 8, function (n) {
            return api.get(C.API + 'move/' + n).then(function (d) {                return { name: n, es: api.esName(d) };
            }, function () { return { name: n, es: null }; });
        }).then(function (results) {
            var map = {};
            results.forEach(function (r) { if (r && r.es) map[r.name] = r.es; });
            rows.forEach(function (r) {
                var es = map[r.getAttribute('data-move')];
                if (es) {
                    var span = r.querySelector('span');
                    if (span) span.textContent = es;
                }
            });
        }).catch(function () {});
    }

    function renderEvoTree(el, chain, mainId) {
        var nodes = [];
        (function walk(node, parentMethod) {
            var id = U.idFromUrl(node.species.url);
            nodes.push({ id: id, name: node.species.name, method: parentMethod || '' });
            var childMethod = (node.evolution_details && node.evolution_details.length)
                ? evoMethodText(node.evolution_details)
                : '';
            (node.evolves_to || []).forEach(function (child) { walk(child, childMethod); });
        })(chain.chain, '');
        el.innerHTML = ui.loader('Traduciendo la evolución...');
        var ids = nodes.map(function (n) { return n.id; });
        api.runPool(ids, 6, function (pid) {
            return api.get(C.API + 'pokemon-species/' + pid).then(function (d) {
                return { id: pid, es: api.esName(d) };
            }, function () { return { id: pid, es: null }; });
        }).then(function (res) {
            var map = {};
            res.forEach(function (r) { if (r && r.es) map[r.id] = r.es; });
            el.innerHTML = nodes.map(function (node, i) {
                var method = node.method
                    ? '<span class="evo-method">' + U.esc(node.method) + '</span>'
                    : '<span class="evo-method">&nbsp;</span>';
                var main = node.id === mainId ? ' current' : '';
                return (i > 0 ? '<span class="evo-arrow">&#9654;</span>' : '') +
                    '<a class="evo-node' + main + '" href="#/pokemon/' + node.id + '">' +
                    ui.pokeImg(node.id, node.name) +
                    '<span class="evo-name">' + U.esc(map[node.id] || U.cap(node.name)) + '</span>' + method + '</a>';
            }).join('');
        }).catch(function () {
            el.innerHTML = nodes.map(function (node, i) {
                var method = node.method
                    ? '<span class="evo-method">' + U.esc(node.method) + '</span>'
                    : '<span class="evo-method">&nbsp;</span>';
                var main = node.id === mainId ? ' current' : '';
                return (i > 0 ? '<span class="evo-arrow">&#9654;</span>' : '') +
                    '<a class="evo-node' + main + '" href="#/pokemon/' + node.id + '">' +
                    ui.pokeImg(node.id, node.name) +
                    '<span class="evo-name">' + U.cap(node.name) + '</span>' + method + '</a>';
            }).join('');
        });
    }

    PW.views.pokemon = async function (container, ctx) {
        var idParam = ctx.params.id;
        var id = parseInt(idParam, 10);
        var formName = null;
        if (isNaN(id) || id < 1 || id > 1025) {
            var all = await api.getNational();
            var found = all.filter(function (p) { return p.name === idParam.toLowerCase(); })[0];
            /* Formas especiales (Mega, Gigamax...) tienen id propio > 1025 que
               no corresponde a una especie; se resuelve la especie real. */
            var target = found ? found.id : (!isNaN(id) ? id : null);
            var formPoke = await api.get(C.API + 'pokemon/' + encodeURIComponent(target || idParam.toLowerCase()))
                .catch(function () { return null; });
            if (!formPoke) { container.innerHTML = ui.empty('Pokémon no encontrado.'); return; }
            formName = formPoke.name;
            id = U.idFromUrl(formPoke.species.url);
        }

        container.innerHTML = ui.loader('Cargando datos del Pokémon...');
        store.addHistory(id);

        var poke, species;
        try {
            poke = await api.get(C.API + 'pokemon/' + (formName || id));
            species = await api.get(C.API + 'pokemon-species/' + id);
        } catch (e) {
            container.innerHTML = ui.error('No se pudieron cargar los datos de este Pokémon.', 'retryPokemon');
            var rb = container.querySelector('#retryPokemon');
            if (rb) rb.addEventListener('click', function () { PW.views.pokemon(container, ctx); });
            return;
        }

        /* Nombres en español de las habilidades */
        var abilityDetails = [];
        try {
            abilityDetails = await Promise.all(poke.abilities.map(function (a) {
                return api.get(C.API + 'ability/' + a.ability.name).then(function (d) {
                    return { name: a.ability.name, es: api.esName(d), hidden: a.is_hidden };
                }, function () { return { name: a.ability.name, es: null, hidden: a.is_hidden }; });
            }));
        } catch (e) {}

        var esName = U.findLocalized(species.names, 'name');
        var enName = poke.name;
        var genus = U.findLocalized(species.genera, 'genus');
        var flavor = getFlavor(species);
        var genNum = U.genFromUrl(species.generation ? species.generation.url : '');
        var analysis = U.defAnalysis(poke.types.map(function (t) { return t.type.name; }));
        var region = state.dex.region || PW.regions[0];
        /* Ilustración oficial: para formas (Mega, Gigamax...) se usa el arte
           propio de la forma en lugar del de la especie base. */
        var formArt = poke.sprites && poke.sprites.other && poke.sprites.other['official-artwork'] &&
            poke.sprites.other['official-artwork'].front_default;
        var artUrl = formArt || (C.ART + id + '.png');

        /* Navegación anterior/siguiente */
        var all = state.all;
        if (!all || !all.length) all = await api.getNational().then(function (a) { state.all = a; return a; });
        var idx = -1;
        for (var i = 0; i < all.length; i++) if (all[i].id === id) { idx = i; break; }
        var prev = idx > 0 ? all[idx - 1] : null;
        var next = idx < all.length - 1 ? all[idx + 1] : null;

        var typesHtml = poke.types.map(function (t) {
            return U.typeChip(t.type.name, 'type-chip-lg');
        }).join('');

        var abilitiesHtml = abilityDetails.map(function (a) {
            var hidden = a.hidden ? ' <em class="hidden-ab">(oculta)</em>' : '';
            return '<a class="ab-link" href="#/ability/' + a.name + '">' +
                U.esc(a.es || U.cap(a.name.replace(/-/g, ' '))) + '</a>' + hidden;
        }).join(', ');

        var badges = '';
        if (species.is_legendary) badges += '<span class="badge-legend">Legendario</span>';
        if (species.is_mythical) badges += '<span class="badge-legend">Mítico</span>';
        if (species.is_baby) badges += '<span class="badge-legend">Bebé</span>';

        var varieties = (species.varieties || []).filter(function (v) {
            return !v.is_default;
        });
        function varietyCard(v) {
            var vid = U.idFromUrl(v.pokemon.url);
            var pad = ('000' + vid).slice(-3);
            var normal = C.SPRITE + vid + '.png';
            var shiny = C.SPRITE + 'shiny/' + vid + '.png';
            return '<a class="poke-card compact" href="#/pokemon/' + vid + '">' +
                '<span class="poke-num">#' + U.pad4(vid) + '</span>' +
                '<img src="' + normal + '" alt="' + U.esc(v.pokemon.name) + '" loading="lazy" referrerpolicy="no-referrer" ' +
                    'data-fb="' + C.POKE_CDN + pad + '.png" ' +
                    'data-normal="' + normal + '" data-shiny="' + shiny + '" ' +
                    'onerror="this.onerror=null;if(this.getAttribute(\'data-fb\')){this.src=this.getAttribute(\'data-fb\');this.removeAttribute(\'data-fb\');}">' +
                '<span class="poke-name">' + U.cap(v.pokemon.name) + '</span>' +
                '</a>';
        }
        var varietiesHtml = varieties.length
            ? '<div class="panel"><h3>Formas y variantes ' +
                '<button type="button" class="btn-secondary btn-xs" id="shinyToggle" data-on="0">Ver shiny</button></h3>' +
                '<div class="mini-grid variety-grid" id="varietyGrid">' + varieties.map(varietyCard).join('') + '</div></div>'
            : '';

        var dexAppearances = (species.pokedex_numbers || []).slice(0, 12).map(function (pn) {
            var dname = pn.pokedex.name.replace(/-/g, ' ');
            return '<span class="chip">' + U.cap(dname) + ' #' + pn.entry_number + '</span>';
        }).join('');

        var statsHtml = ui.statBars(statsOf(poke.stats), { total: totalOf(poke.stats) });

        var fav = ui.favButton(id);

        var prevHtml = prev
            ? '<a class="nav-arrow prev" href="#/pokemon/' + prev.id + '"><small>Anterior</small> #' + U.pad4(prev.id) + ' ' + U.cap(prev.name) + '</a>'
            : '<span class="nav-arrow disabled"></span>';
        var nextHtml = next
            ? '<a class="nav-arrow next" href="#/pokemon/' + next.id + '"><small>Siguiente</small> #' + U.pad4(next.id) + ' ' + U.cap(next.name) + '</a>'
            : '<span class="nav-arrow disabled"></span>';

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/dex">Pokédex</a> › <span>#' + U.pad4(id) + ' ' + U.cap(enName) + '</span></nav>' +

            '<div class="pokemon-nav-top">' + prevHtml + nextHtml + '</div>' +

            '<section class="dex-screen">' +
                '<div class="dex-screen-top">' +
                    '<div class="poke-art">' + ui.imgFallback(artUrl, C.POKE_CDN + ('000' + id).slice(-3) + '.png', enName) + '</div>' +
                    '<div class="dex-screen-info">' +
                        '<span class="poke-num-big">#' + U.pad4(id) + '</span>' +
                        '<h2>' + U.esc(esName || U.cap(enName)) +
                            (esName && esName.toLowerCase() !== enName.toLowerCase()
                                ? '<span class="en-name">' + U.cap(enName) + '</span>'
                                : '') +
                        '</h2>' +
                        (genus ? '<div class="genus">' + U.esc(genus) + '</div>' : '') +
                        '<div class="badge-row">' + typesHtml + badges + '</div>' +
                        '<div class="fav-inline">' + fav + ' <span>Marcar como favorito</span></div>' +
                        (flavor ? '<p class="flavor">' + U.esc(flavor) + '</p>' : '') +
                    '</div>' +
                '</div>' +

                '<div class="dl-grid">' +
                    '<dt>Altura</dt><dd>' + (poke.height / 10).toFixed(1).replace('.', ',') + ' m</dd>' +
                    '<dt>Peso</dt><dd>' + (poke.weight / 10).toFixed(1).replace('.', ',') + ' kg</dd>' +
                    '<dt>Categoría</dt><dd>' + U.esc(genus || 'No disponible') + '</dd>' +
                    '<dt>Generación</dt><dd>' + U.esc(U.genLabel(genNum)) + '</dd>' +
                    '<dt>Ratio de captura</dt><dd>' + (species.capture_rate != null ? species.capture_rate + ' / 255' : 'No disponible') + '</dd>' +
                    '<dt>Género</dt><dd>' + U.esc(U.genderRatio(species.gender_rate)) + '</dd>' +
                    '<dt>Grupos huevo</dt><dd>' + (species.egg_groups && species.egg_groups.length
                        ? species.egg_groups.map(function (g) { return U.esc(PW.dicts.eggGroups[g.name] || U.cap(g.name.replace(/-/g, ' '))); }).join(', ')
                        : 'No disponible') + '</dd>' +
                    '<dt>Experiencia base</dt><dd>' + (poke.base_experience != null ? poke.base_experience : 'No disponible') + '</dd>' +
                    '<dt>Felicidad base</dt><dd>' + (species.base_happiness != null ? species.base_happiness : 'No disponible') + '</dd>' +
                '</div>' +

                (dexAppearances ? '<div class="panel"><h3>Aparece en las Pokédex de</h3><div class="chip-line">' + dexAppearances + '</div></div>' : '') +

                '<div class="stats"><h3>Estadísticas base</h3>' + statsHtml + '</div>' +

                '<div class="panel"><h3>Eficacia defensiva</h3>' + ui.analysisGroup(analysis) +
                    '<p class="hint">Valores según la tabla de tipos moderna (Gen 6+).</p>' +
                '</div>' +

                (varietiesHtml) +

                '<div class="evo-line"><div class="evo-title">Línea evolutiva</div>' +
                    '<div class="evo-chain" id="evoChain">' + ui.loader('Cargando evolución...') + '</div></div>' +

                '<div class="panel"><h3>Dónde capturarlo</h3>' +
                    '<div id="encounters">' + ui.loader('Buscando lugares de captura...') + '</div>' +
                    '<p class="hint">Lugares y métodos según el juego donde aparece este Pokémon.</p>' +
                '</div>' +

                '<div class="moves"><div class="moves-title">Movimientos (' + (poke.moves || []).length + ')</div>' +
                    buildMovesHtml(poke.moves || []) + '</div>' +
            '</section>' +

            '<div class="pokemon-nav-bottom">' +
                '<a class="btn-secondary" href="#/dex' + (region ? '?region=' + encodeURIComponent(region.name) : '') + '">Volver a la Pokédex</a>' +
                prevHtml + nextHtml +
            '</div>';

        var evoChainEl = container.querySelector('#evoChain');
        if (evoChainEl) {
            if (!species.evolution_chain) {
                evoChainEl.innerHTML = ui.empty('Sin evolución registrada.');
            } else {
                api.get(species.evolution_chain.url).then(function (chain) {
                    renderEvoTree(evoChainEl, chain, id);
                }).catch(function () {
                    evoChainEl.innerHTML = ui.empty('No se pudo cargar la línea evolutiva.');
                });
            }
        }

        var encEl = container.querySelector('#encounters');
        if (encEl) {
            api.getEncounters(id).then(function (encs) {
                if (!encs || !encs.length) {
                    encEl.innerHTML = ui.empty('Este Pokémon no aparece en estado salvaje (regalos, eventos o huevos).');
                    return;
                }
                var byRegion = {};
                encs.forEach(function (e) {
                    if (!byRegion[e.regionEs]) byRegion[e.regionEs] = [];
                    byRegion[e.regionEs].push(e);
                });
                encEl.innerHTML = Object.keys(byRegion).map(function (reg) {
                    return '<div class="capture-region">' +
                        '<h4 class="capture-region-name">' + U.esc(reg) + '</h4>' +
                        byRegion[reg].map(function (e) {
                            var seen = {}, chips = [];
                            e.details.forEach(function (d) {
                                d.encounters.forEach(function (en) {
                                    var label = d.groupEs + ' · ' + en.methodEs +
                                        ' (Nv. ' + en.min + (en.max && en.max !== en.min ? '-' + en.max : '') + ')';
                                    if (!seen[label]) { seen[label] = true; chips.push(label); }
                                });
                            });
                            return '<div class="capture-area">' +
                                '<strong>' + U.esc(e.areaEs) + '</strong>' +
                                '<span class="capture-methods">' + chips.map(function (c) {
                                    return '<span class="chip">' + U.esc(c) + '</span>';
                                }).join('') + '</span></div>';
                        }).join('') + '</div>';
                }).join('');
            }).catch(function () {
                encEl.innerHTML = ui.empty('No se pudieron cargar los lugares de captura.');
            });
        }

        var shinyBtn = container.querySelector('#shinyToggle');
        if (shinyBtn) shinyBtn.addEventListener('click', function () {
            var on = shinyBtn.getAttribute('data-on') === '1';
            on = !on;
            shinyBtn.setAttribute('data-on', on ? '1' : '0');
            shinyBtn.textContent = on ? 'Ver normal' : 'Ver shiny';
            container.querySelectorAll('#varietyGrid img[data-shiny]').forEach(function (img) {
                if (on) {
                    img.dataset.retFb = img.getAttribute('data-fb');
                    img.setAttribute('data-fb', img.getAttribute('data-normal'));
                    img.src = img.getAttribute('data-shiny');
                } else {
                    img.setAttribute('data-fb', img.dataset.retFb || '');
                    img.src = img.getAttribute('data-normal');
                }
            });
        });

        localizeMoves(container);
    };

    function statsOf(stats) {
        var out = {};
        stats.forEach(function (s) { out[s.stat.name] = s.base_stat; });
        return out;
    }
    function totalOf(stats) {
        var t = 0;
        stats.forEach(function (s) { t += s.base_stat; });
        return t;
    }
    function getFlavor(species) {
        var entries = species.flavor_text_entries || [];
        var entry = entries.filter(function (f) {
            return f.language.name === 'es' && f.version && f.version.name === 'x';
        })[0] || entries.filter(function (f) { return f.language.name === 'es'; })[0] ||
            entries.filter(function (f) { return f.language.name === 'en'; })[0];
        if (!entry) return '';
        return entry.flavor_text.replace(/[\f\n\r]+/g, ' ');
    }

    /* ============================ TIPOS ============================ */

    PW.views.types = function (container) {
        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Tipos Pokémon</h1>' +
                '<p class="subtitle">Efectividades, debilidades y Pokémon de cada tipo</p>' +
            '</div></header>' +
            '<div class="filterbar"><div class="filterbar-row">' +
                '<label class="fgroup fsearch"><span>Buscar</span>' +
                    '<input type="search" id="typeSearch" placeholder="Buscar tipo..." autocomplete="off"></label>' +
                '<button type="button" class="btn-secondary" id="typeReset">Reiniciar filtros</button>' +
            '</div></div>' +
            '<div class="type-grid" id="typeGrid">' + PW.types.map(function (t) {
                return '<a class="type-card" href="#/type/' + t + '" data-api="' + t + '" data-es="' + PW.typeEs[t] + '" style="background:' + (PW.typeColors[t] || '#888') + '">' +
                    '<strong>' + U.esc(PW.typeEs[t]) + '</strong><small>' + U.cap(t) + '</small></a>';
            }).join('') + '</div>' +
            '<div class="home-panel"><h2>Calculadora de tipos</h2>' +
                '<p>Elige una o dos combinaciones de tipos y descubre contra qué es débil, qué resiste y a qué es inmune.</p>' +
                '<a class="btn-primary" href="#/types/calc">Abrir calculadora</a></div>';

        var grid = container.querySelector('#typeGrid');
        var search = container.querySelector('#typeSearch');
        function applyTypeFilter() {
            var q = search.value.toLowerCase();
            grid.querySelectorAll('.type-card').forEach(function (card) {
                var ok = !q ||
                    card.getAttribute('data-es').toLowerCase().indexOf(q) !== -1 ||
                    card.getAttribute('data-api').indexOf(q) !== -1;
                card.style.display = ok ? '' : 'none';
            });
        }
        search.addEventListener('input', U.debounce(applyTypeFilter, 200));
        container.querySelector('#typeReset').addEventListener('click', function () {
            search.value = '';
            applyTypeFilter();
        });
    };

    PW.views.typeCalc = function (container) {
        function sel(name, value) {
            return '<select id="' + name + '">' +
                '<option value="">—</option>' +
                PW.types.map(function (t) {
                    return '<option value="' + t + '"' + (t === value ? ' selected' : '') + '>' +
                        U.esc(PW.typeEs[t]) + '</option>';
                }).join('') + '</select>';
        }
        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Calculadora de tipos</h1>' +
                '<p class="subtitle">Descubre cómo se comporta cualquier combinación de tipos</p>' +
            '</div></header>' +
            '<div class="panel">' +
                '<div class="calc-types">' +
                    '<label>Tipo 1 ' + sel('calcT1', '') + '</label>' +
                    '<label>Tipo 2 ' + sel('calcT2', '') + '</label>' +
                '</div>' +
                '<div id="calcResult"><div class="empty-state">Selecciona al menos un tipo para ver el análisis.</div></div>' +
            '</div>';
        var result = container.querySelector('#calcResult');
        function update() {
            var t1 = container.querySelector('#calcT1').value;
            var t2 = container.querySelector('#calcT2').value;
            if (!t1 && !t2) {
                result.innerHTML = '<div class="empty-state">Selecciona al menos un tipo.</div>';
                return;
            }
            var defTypes = [];
            if (t1) defTypes.push(t1);
            if (t2) defTypes.push(t2);
            var analysis = U.defAnalysis(defTypes);
            result.innerHTML =
                '<div class="calc-combo">' + defTypes.map(U.typeChip).join('') + '</div>' +
                ui.analysisGroup(analysis);
        }
        container.querySelector('#calcT1').addEventListener('change', update);
        container.querySelector('#calcT2').addEventListener('change', update);
    };

    PW.views.typeDetail = async function (container, ctx) {
        var name = ctx.params.name;
        container.innerHTML = ui.loader('Cargando tipo...');
        var type;
        try { type = await api.getTypeDetail(name); } catch (e) {
            container.innerHTML = ui.error('No se pudo cargar el tipo "' + U.esc(name) + '".');
            return;
        }
        var esName = U.findLocalized(type.names, 'name');
        var genNum = U.genFromUrl(type.generation ? type.generation.url : '');
        var color = PW.typeColors[name] || '#888';

        function relList(label, arr, mult, cls) {
            if (!arr || !arr.length) return '';
            return '<div class="ana-block' + (cls ? ' ' + cls : '') + '"><span class="ana-label">' + label + '</span>' +
                '<span class="ana-chips">' + arr.map(function (x) {
                    return '<span class="ana-chip">' + U.typeChip(x.name) +
                        (mult ? '<small class="ana-mult">' + mult + '</small>' : '') + '</span>';
                }).join('') + '</span></div>';
        }

        var pokemon = (type.pokemon || []).map(function (p) {
            return { id: U.idFromUrl(p.pokemon.url), name: p.pokemon.name };
        });
        var moves = (type.moves || []);
        var TYPE_PAGE = 60;
        var tst = { q: '', sort: 'num', dir: 'asc', shown: 0 };

        function pokeCard(p) {
            return ui.card({ id: p.id, name: p.name }, { compact: true });
        }

        var pokemonHtml = '<div id="typePokes" class="mini-grid"></div>';

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/types">Tipos</a> › <span>' + U.esc(esName || U.cap(name)) + '</span></nav>' +
            '<header class="dex-header">' +
                '<div>' +
                    '<h1 class="page-title">Tipo ' + U.esc(esName || U.cap(name)) + '</h1>' +
                    '<p class="subtitle">' + U.esc(U.genLabel(genNum)) + ' · ' + pokemon.length + ' Pokémon · ' + moves.length + ' movimientos</p>' +
                '</div>' +
                '<div class="dex-actions">' +
                    '<span id="typeInfo" class="view-info"></span>' +
                    '<button id="loadMoreType" class="btn-primary" hidden>Cargar más</button>' +
                '</div>' +
            '</header>' +
            '<div class="type-hero" style="border-color:' + color + '">' +
                '<div class="type-hero-chip" style="background:' + color + '">' + U.esc(PW.typeEs[name]) + '</div>' +
            '</div>' +
            '<div class="panel"><h3>Al defender como ' + U.esc(esName || name) + '</h3>' +
                relList('Débil contra', type.damage_relations.double_damage_from, 'x2', 'ana-weak') +
                relList('Resiste', type.damage_relations.half_damage_from, 'x1/2') +
                relList('Inmune', type.damage_relations.no_damage_from, 'x0', 'ana-immune') +
            '</div>' +
            '<div class="panel"><h3>Al atacar como ' + U.esc(esName || name) + '</h3>' +
                relList('Supereficaz contra', type.damage_relations.double_damage_to, 'x2', 'ana-weak') +
                relList('Poco eficaz contra', type.damage_relations.half_damage_to, 'x1/2') +
                relList('Sin efecto contra', type.damage_relations.no_damage_to, 'x0', 'ana-immune') +
            '</div>' +
            '<div class="home-panel"><h3>Pokémon de tipo ' + U.esc(esName || U.cap(name)) + ' (' + pokemon.length + ')</h3>' +
                '<div class="filterbar"><div class="filterbar-row">' +
                    '<label class="fgroup fsearch"><span>Buscar</span>' +
                        '<input type="search" id="typePokeSearch" placeholder="Filtrar por nombre..." autocomplete="off"></label>' +
                    '<label class="fgroup"><span>Ordenar por</span>' +
                        '<select id="typeSort"><option value="num">Número</option><option value="name">Nombre</option></select></label>' +
                    '<label class="fgroup"><span>Orden</span>' +
                        '<select id="typeDir"><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></label>' +
                    '<button type="button" class="btn-secondary" id="typePokeReset">Reiniciar</button>' +
                '</div></div>' +
                pokemonHtml +
            '</div>' +
            '<div class="home-panel"><h3>Movimientos de tipo ' + U.esc(esName || U.cap(name)) + ' (' + moves.length + ')</h3>' +
                '<p class="hint">' + moves.slice(0, 120).map(function (m) {
                    return '<a class="chip link" href="#/move/' + m.name + '">' + U.cap(m.name.replace(/-/g, ' ')) + '</a>';
                }).join(' ') +
                (moves.length > 120 ? '…' : '') + '</p></div>';

        var pokeGrid = container.querySelector('#typePokes');
        var pokeSearch = container.querySelector('#typePokeSearch');
        var typeSort = container.querySelector('#typeSort');
        var typeDir = container.querySelector('#typeDir');
        var typeReset = container.querySelector('#typePokeReset');
        var typeInfo = container.querySelector('#typeInfo');
        var loadMore = container.querySelector('#loadMoreType');

        function visiblePokes() {
            var q = tst.q.toLowerCase();
            var list = q ? pokemon.filter(function (p) { return p.name.indexOf(q) !== -1; }) : pokemon.slice();
            list.sort(function (a, b) {
                if (tst.sort === 'name') return a.name.localeCompare(b.name);
                return a.id - b.id;
            });
            if (tst.dir === 'desc') list.reverse();
            return list;
        }
        function renderPokes() {
            var list = visiblePokes();
            var batch = list.slice(tst.shown, tst.shown + TYPE_PAGE);
            if (!batch.length) {
                if (tst.shown === 0) pokeGrid.innerHTML = ui.empty('No hay Pokémon con ese nombre.');
                typeInfo.textContent = 'Mostrando ' + list.length + ' de ' + list.length;
                loadMore.hidden = true;
                return;
            }
            pokeGrid.innerHTML += batch.map(pokeCard).join('');
            tst.shown += batch.length;
            typeInfo.textContent = 'Mostrando ' + Math.min(tst.shown, list.length) + ' de ' + list.length;
            loadMore.hidden = tst.shown >= list.length;
        }
        loadMore.addEventListener('click', renderPokes);
        pokeSearch.addEventListener('input', U.debounce(function () {
            tst.q = this.value;
            tst.shown = 0;
            pokeGrid.innerHTML = '';
            renderPokes();
        }, 220));
        typeSort.addEventListener('change', function () {
            tst.sort = this.value;
            tst.shown = 0;
            pokeGrid.innerHTML = '';
            renderPokes();
        });
        typeDir.addEventListener('change', function () {
            tst.dir = this.value;
            tst.shown = 0;
            pokeGrid.innerHTML = '';
            renderPokes();
        });
        typeReset.addEventListener('click', function () {
            tst.q = '';
            tst.sort = 'num';
            tst.dir = 'asc';
            tst.shown = 0;
            pokeSearch.value = '';
            typeSort.value = 'num';
            typeDir.value = 'asc';
            pokeGrid.innerHTML = '';
            renderPokes();
        });
        renderPokes();
    };

    /* ============================ REGIONES ============================ */

    PW.views.regions = function (container) {
        var regionCards = PW.regions.map(function (r) {
            return '<a class="region-card" href="#/region/' + r.api + '">' +
                '<span class="region-gen">Gen ' + r.gen + '</span>' +
                '<strong>' + U.esc(r.name) + '</strong>' +
                '<small>' + (r.end - r.start + 1) + ' Pokémon</small>' +
                '</a>';
        }).join('');
        regionCards += '<a class="region-card" href="#/region/hisui">' +
            '<span class="region-gen">Gen VIII</span><strong>Hisui</strong>' +
            '<small>Pokémon Legends</small></a>';

        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Regiones</h1>' +
                '<p class="subtitle">El mundo Pokémon, región por región</p>' +
            '</div></header>' +
            '<div class="region-grid">' + regionCards + '</div>' +
            '<div class="home-panel"><h2>Pokédex de cada región</h2>' +
                '<p>Selecciona una región en la barra lateral o en la Pokédex para recorrer sus Pokémon en orden.</p>' +
                '<a class="btn-primary" href="#/dex">Abrir Pokédex</a></div>';
    };

    PW.views.regionDetail = async function (container, ctx) {
        var apiName = ctx.params.name;
        container.innerHTML = ui.loader('Cargando región...');
        var region;
        try { region = await api.getRegionDetail(apiName); } catch (e) {
            container.innerHTML = ui.error('No se pudo cargar la región.');
            return;
        }
        var idx = PW.regionByApi[apiName];
        var known = idx != null ? PW.regions[idx] : null;
        var esName = known ? known.name : (U.findLocalized(region.names, 'name') || U.cap(apiName));
        var genNum = U.genFromUrl(region.main_generation ? region.main_generation.url : '');

        var games = (region.version_groups || []).map(function (vg) {
            return '<span class="chip">' + U.esc(PW.dicts.versionGroups[vg.name] || U.cap(vg.name.replace(/-/g, ' '))) + '</span>';
        }).join('');
        var dexes = (region.pokedexes || []).map(function (d) {
            return '<span class="chip">' + U.esc(PW.dicts.pokedexes[d.name] || U.cap(d.name.replace(/-/g, ' '))) + '</span>';
        }).join('');
        var mapUrl = C.REGION_MAPS[esName];

        function loreHtml() {
            var info = known && PW.regionLore[known.name];
            if (!info) return '';
            function gymsHtml() {
                if (!info.gyms) return '';
                return '<div class="panel"><h3>Gimnasios y líderes</h3>' +
                    '<div class="lore-list">' + info.gyms.map(function (g) {
                        return '<div class="lore-row">' +
                            '<strong>' + U.esc(g.leader) + '</strong>' +
                            '<span class="chip">' + U.esc(g.city) + '</span>' +
                            (g.badge ? '<span class="chip">Insignia ' + U.esc(g.badge) + '</span>' : '') +
                            (g.type ? U.typeChip(g.type) : '') +
                        '</div>';
                    }).join('') + '</div></div>';
            }
            function e4Html() {
                if (!info.eliteFour) return '';
                if (typeof info.eliteFour === 'string') {
                    return '<div class="panel"><h3>Alto Mando</h3><p class="effect-text">' + U.esc(info.eliteFour) + '</p></div>';
                }
                return '<div class="panel"><h3>Alto Mando de ' + U.esc(known.name) + '</h3>' +
                    '<div class="chip-line">' + info.eliteFour.map(function (e) {
                        return '<span class="chip">' + U.esc(e.name) + (e.type ? ' ' + U.typeChip(e.type) : '') + '</span>';
                    }).join('') + '</div></div>';
            }
            function champHtml() {
                if (!info.champion) return '';
                return '<div class="panel"><h3>Campeón de la Liga</h3><p class="effect-text">' + U.esc(info.champion) + '</p></div>';
            }
            function villainsHtml() {
                if (!info.villains) return '';
                return '<div class="panel"><h3>Antagonistas</h3><p class="effect-text">' + U.esc(info.villains) + '</p></div>';
            }
            function pointsHtml() {
                if (!info.points) return '';
                return '<div class="panel"><h3>Puntos de interés</h3><div class="chip-line">' + info.points.map(function (p) {
                    return '<span class="chip">' + U.esc(p) + '</span>';
                }).join('') + '</div></div>';
            }
            return '<div class="home-panel"><h2>Historia de ' + U.esc(known.name) + '</h2>' +
                '<p class="effect-text">' + U.esc(info.history) + '</p></div>' +
                gymsHtml() + e4Html() + champHtml() + villainsHtml() + pointsHtml();
        }

        container.innerHTML =
            '<nav class="breadcrumb"><a href="#/">Inicio</a> › <a href="#/regions">Regiones</a> › <span>' + U.esc(esName) + '</span></nav>' +
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Región de ' + U.esc(esName) + '</h1>' +
                '<p class="subtitle">' + U.esc(U.genLabel(genNum)) + '</p>' +
            '</div></header>' +
            (mapUrl
                ? '<div class="panel region-map"><img src="' + mapUrl + '" alt="Mapa de ' + U.esc(esName) + '" loading="lazy" referrerpolicy="no-referrer"></div>'
                : '<div class="panel"><p class="hint">No hay mapa disponible para esta región.</p></div>') +
            '<div class="panel"><h3>Juegos de la región</h3><div class="chip-line">' + (games || 'No disponible') + '</div></div>' +
            '<div class="panel"><h3>Pokédex de la región</h3><div class="chip-line">' + (dexes || 'No disponible') + '</div>' +
                (known
                    ? '<p class="hint">Esta región tiene ' + (known.end - known.start + 1) + ' Pokémon en la Pokédex Nacional.</p>' +
                        '<a class="btn-primary" href="#/dex?region=' + encodeURIComponent(known.name) + '">Ver Pokédex de ' + U.esc(known.name) + '</a>'
                    : '<p class="hint">Esta región usa una numeración propia de la Pokédex de Hisui; sus Pokémon están incluidos en las generaciones correspondientes.</p>') +
            '</div>' +
            '<div class="panel"><h3>Localizaciones</h3>' +
                '<p>' + U.formatNum(region.locations ? region.locations.length : null) + ' lugares registrados.</p></div>' +
            loreHtml();
    };

    /* ============================ LEGENDARIOS ============================ */

    PW.views.legendary = function (container) {
        var region = state.dex.region || PW.regions[0];
        var opts = [PW.regionsAll].concat(PW.regions).map(function (r) {
            return '<option value="' + r.name + '"' + (r.name === region.name ? ' selected' : '') + '>' +
                U.esc(r.name) + ' (Gen ' + r.gen + ')</option>';
        }).join('');
        var typeOpts = '<option value="">Cualquier tipo</option>' + PW.types.map(function (t) {
            return '<option value="' + t + '">' + U.esc(PW.typeEs[t]) + '</option>';
        }).join('');
        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Legendarios y Míticos</h1>' +
                '<p class="subtitle">Los Pokémon únicos de cada región</p>' +
            '</div></header>' +
            '<div class="filterbar"><div class="filterbar-row">' +
                '<label class="fgroup"><span>Región</span><select id="legRegion">' + opts + '</select></label>' +
                '<label class="fgroup"><span>Tipo</span><select id="legType">' + typeOpts + '</select></label>' +
                '<label class="fgroup"><span>Orden</span>' +
                    '<select id="legDir"><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></label>' +
            '</div><div class="filterbar-row"><span id="legStatus" class="filter-status"></span></div></div>' +
            '<div id="legGrid" class="pokedex-grid">' + ui.loader('Cargando datos de la región...') + '</div>';

        var select = container.querySelector('#legRegion');
        var typeSel = container.querySelector('#legType');
        var dirSel = container.querySelector('#legDir');
        var statusEl = container.querySelector('#legStatus');
        var gridEl = container.querySelector('#legGrid');

        function resolveRegion(name) {
            return [PW.regionsAll].concat(PW.regions).filter(function (r) { return r.name === name; })[0] || region;
        }

        function load() {
            var reg = resolveRegion(select.value);
            gridEl.innerHTML = ui.loader('Analizando Pokémon de ' + reg.name + '...');
            api.ensureRegionExtra(reg, function (st) {
                statusEl.innerHTML = '<span class="mini-progress-text">' + st.phase + ' ' + st.done + '/' + st.total + '</span>';
            }).then(function (recs) {
                statusEl.textContent = '';
                var type = typeSel.value;
                var dir = dirSel.value;
                var legends = recs.filter(function (r) {
                    if (!(r.legendary || r.mythical)) return false;
                    if (type && (r.types || []).indexOf(type) === -1) return false;
                    return true;
                }).sort(function (a, b) {
                    return dir === 'desc' ? b.id - a.id : a.id - b.id;
                });
                if (!legends.length) {
                    gridEl.innerHTML = ui.empty('No hay legendarios ni míticos que coincidan.');
                    return;
                }
                gridEl.innerHTML = legends.map(function (r) {
                    return ui.card(r, { types: true, badges: true, compact: false });
                }).join('');
            }).catch(function () {
                statusEl.textContent = 'No se pudo cargar.';
                gridEl.innerHTML = ui.error('No se pudieron cargar los datos.');
            });
        }
        select.addEventListener('change', load);
        typeSel.addEventListener('change', load);
        dirSel.addEventListener('change', load);
        load();
    };
})();
