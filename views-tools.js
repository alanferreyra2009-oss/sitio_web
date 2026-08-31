/* =========================================================================
   Pokepedia — Herramientas: Team Builder, Comparador, Rankings, Generadores
   ========================================================================= */

(function () {
    'use strict';

    var C = PW.config;
    var U = PW.utils;
    var api = PW.api;
    var ui = PW.ui;
    var store = PW.store;
    var state = PW.state;

    /* ================= Pickers (búsqueda con autocompletado) ================= */

    function pokemonPicker(container, placeholder, onSelect) {
        var wrap = document.createElement('div');
        wrap.className = 'picker';
        var input = document.createElement('input');
        input.type = 'search';
        input.placeholder = placeholder || 'Buscar Pokémon...';
        input.autocomplete = 'off';
        var list = document.createElement('div');
        list.className = 'picker-list';
        wrap.appendChild(input);
        wrap.appendChild(list);
        container.appendChild(wrap);

        input.addEventListener('input', U.debounce(async function () {
            var term = this.value.trim().toLowerCase();
            if (!term) { list.innerHTML = ''; list.classList.remove('open'); return; }
            var all = await api.getNational();
            var matches = all.filter(function (p) {
                return p.name.indexOf(term) !== -1 || U.pad4(p.id).indexOf(term) !== -1;
            }).slice(0, 8);
            list.innerHTML = matches.map(function (p) {
                return '<button type="button" class="picker-item" data-id="' + p.id + '">#' + U.pad4(p.id) + ' ' + U.cap(p.name) + '</button>';
            }).join('');
            list.classList.add('open');
        }, 150));

        wrap.addEventListener('click', function (e) {
            var item = e.target.closest('.picker-item');
            if (item) {
                onSelect(parseInt(item.dataset.id, 10));
                input.value = '';
                list.innerHTML = '';
                list.classList.remove('open');
            }
        });
        document.addEventListener('click', function (e) {
            if (!wrap.contains(e.target)) list.classList.remove('open');
        });
        return input;
    }

    function movePicker(container, placeholder, onSelect) {
        var wrap = document.createElement('div');
        wrap.className = 'picker';
        var input = document.createElement('input');
        input.type = 'search';
        input.placeholder = placeholder || 'Buscar movimiento...';
        input.autocomplete = 'off';
        var list = document.createElement('div');
        list.className = 'picker-list';
        wrap.appendChild(input);
        wrap.appendChild(list);
        container.appendChild(wrap);

        input.addEventListener('input', U.debounce(async function () {
            var term = this.value.trim().toLowerCase();
            if (!term) { list.innerHTML = ''; list.classList.remove('open'); return; }
            var moves = await api.getList('moves');
            var matches = moves.filter(function (m) { return m.name.indexOf(term) !== -1; }).slice(0, 8);
            list.innerHTML = matches.map(function (m) {
                return '<button type="button" class="picker-item" data-name="' + U.esc(m.name) + '">' +
                    U.cap(m.name.replace(/-/g, ' ')) + '</button>';
            }).join('');
            list.classList.add('open');
        }, 150));

        wrap.addEventListener('click', function (e) {
            var item = e.target.closest('.picker-item');
            if (item) {
                onSelect(item.dataset.name);
                input.value = '';
                list.innerHTML = '';
                list.classList.remove('open');
            }
        });
        document.addEventListener('click', function (e) {
            if (!wrap.contains(e.target)) list.classList.remove('open');
        });
        return input;
    }

    /* ================= FAVORITOS ================= */

    PW.views.favorites = async function (container) {
        var favs = store.getFavs();
        if (!state.all || !state.all.length) await api.getNational().then(function (a) { state.all = a; });
        var cards = favs.length
            ? favs.map(function (id) {
                return ui.card({ id: id, name: nameOf(id) }, { compact: false });
            }).join('')
            : ui.empty('Aún no tienes Pokémon favoritos.');

        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Mis favoritos</h1>' +
                '<p class="subtitle">' + favs.length + ' Pokémon guardados</p>' +
            '</div></header>' +
            '<div class="pokedex-grid">' + cards + '</div>' +
            (favs.length
                ? '<div class="center" style="margin-top:18px"><button class="btn-secondary" id="clearFavs">Vaciar favoritos</button></div>'
                : '');

        var clearBtn = container.querySelector('#clearFavs');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            if (confirm('¿Vaciar todos los favoritos?')) {
                store.clearFavs();
                ui.toast('Favoritos vaciados.');
                location.hash = '#/favorites';
                PW.router.render();
            }
        });
    };

    /* ================= HISTORIAL ================= */

    PW.views.history = async function (container) {
        var hist = store.getHistory();
        if (!state.all || !state.all.length) await api.getNational().then(function (a) { state.all = a; });
        var cards = hist.length
            ? hist.map(function (id) {
                return ui.card({ id: id, name: nameOf(id) }, { compact: false });
            }).join('')
            : ui.empty('Todavía no has visitado ningún Pokémon.');

        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Vistos recientemente</h1>' +
                '<p class="subtitle">Tu historial de consultas</p>' +
            '</div></header>' +
            '<div class="pokedex-grid">' + cards + '</div>' +
            (hist.length
                ? '<div class="center" style="margin-top:18px"><button class="btn-secondary" id="clearHist">Borrar historial</button></div>'
                : '');

        var clearBtn = container.querySelector('#clearHist');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            store.clearHistory();
            ui.toast('Historial borrado.');
            location.hash = '#/history';
            PW.router.render();
        });
    };

    function nameOf(id) {
        var all = state.all || [];
        for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].name;
        return '???';
    }

    /* ================= GENERADOR ALEATORIO ================= */

    PW.views.random = function (container) {
        var regOpts = '<option value="__all">Nacional</option>' + PW.regions.map(function (r) {
            return '<option value="' + r.name + '">' + U.esc(r.name) + '</option>';
        }).join('');
        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Generador aleatorio</h1>' +
                '<p class="subtitle">Un Pokémon al azar, o un equipo completo de 6</p>' +
            '</div></header>' +
            '<div class="panel">' +
                '<h3>Pokémon aleatorio</h3>' +
                '<div class="filterbar"><div class="filterbar-row">' +
                    '<label class="fgroup"><span>Región</span><select id="randRegion">' + regOpts + '</select></label>' +
                    '<label class="fgroup"><span>Tipo</span><select id="randType"><option value="">Cualquiera</option>' +
                        PW.types.map(function (t) { return '<option value="' + t + '">' + U.esc(PW.typeEs[t]) + '</option>'; }).join('') +
                    '</select></label>' +
                '</div>' +
                '<div class="filterbar-row filter-checks">' +
                    '<label class="fcheck"><input type="checkbox" id="randLegendary"> Solo legendarios</label>' +
                    '<label class="fcheck"><input type="checkbox" id="randEvolved"> Solo evolucionados</label>' +
                    '<button type="button" class="btn-primary" id="randGo">¡Sorpréndeme!</button>' +
                    '<span id="randStatus" class="filter-status"></span>' +
                '</div></div>' +
                '<div id="randResult" class="rand-result"></div>' +
            '</div>' +
            '<div class="panel">' +
                '<h3>Equipo aleatorio de 6</h3>' +
                '<div class="filterbar"><div class="filterbar-row">' +
                    '<label class="fgroup"><span>Región</span><select id="teamRegion">' + regOpts + '</select></label>' +
                '</div>' +
                '<div class="filterbar-row filter-checks">' +
                    '<label class="fcheck"><input type="checkbox" id="teamNoLegends" checked> Excluir legendarios</label>' +
                    '<label class="fcheck"><input type="checkbox" id="teamEvolved" checked> Solo evolucionados</label>' +
                    '<button type="button" class="btn-primary" id="teamGo">Generar equipo</button>' +
                '</div></div>' +
                '<div id="teamResult" class="rand-result"></div>' +
            '</div>';

        container.querySelector('#randGo').addEventListener('click', function () {
            randOne(container);
        });
        container.querySelector('#teamGo').addEventListener('click', function () {
            randTeam(container);
        });
    };

    async function buildRandomPool(container, regionName) {
        var region = null;
        if (regionName && regionName !== '__all') {
            region = PW.regions.filter(function (r) { return r.name === regionName; })[0] || null;
        }
        if (!state.all || !state.all.length) await api.getNational().then(function (a) { state.all = a; });
        if (region) {
            return state.all.filter(function (p) { return p.id >= region.start && p.id <= region.end; });
        }
        return state.all;
    }

    async function randOne(container) {
        var statusEl = container.querySelector('#randStatus');
        var resultEl = container.querySelector('#randResult');
        var regionName = container.querySelector('#randRegion').value;
        var type = container.querySelector('#randType').value;
        var onlyLeg = container.querySelector('#randLegendary').checked;
        var evolved = container.querySelector('#randEvolved').checked;

        var advanced = type || onlyLeg || evolved;
        var region = null;
        if (regionName !== '__all') {
            region = PW.regions.filter(function (r) { return r.name === regionName; })[0] || null;
        }
        if (advanced && !region) {
            resultEl.innerHTML = '<div class="empty-state">Para filtrar por tipo, legendarios o evolucionados, elige una región concreta.</div>';
            return;
        }

        var pool = await buildRandomPool(container, regionName);
        resultEl.innerHTML = ui.loader('Eligiendo un Pokémon al azar...');
        if (!advanced) {
            var pick = pool[Math.floor(Math.random() * pool.length)];
            showRandomResult(resultEl, pick.id, pick.name);
            return;
        }
        try {
            var recs = await api.ensureRegionExtra(region, function (st) {
                statusEl.textContent = 'Cargando datos... ' + st.done + '/' + st.total;
            });
            statusEl.textContent = '';
            var filtered = recs.filter(function (r) {
                if (type && r.types.indexOf(type) === -1) return false;
                if (onlyLeg && !(r.legendary || r.mythical)) return false;
                if (evolved && r.canEvolve) return false;
                return true;
            });
            if (!filtered.length) {
                resultEl.innerHTML = ui.empty('No hay Pokémon que cumplan esos criterios en ' + region.name + '.');
                return;
            }
            var chosen = filtered[Math.floor(Math.random() * filtered.length)];
            showRandomResult(resultEl, chosen.id, chosen.name);
        } catch (e) {
            statusEl.textContent = 'Error de conexión.';
            resultEl.innerHTML = ui.error('No se pudo completar la petición.');
        }
    }

    function showRandomResult(resultEl, id, name) {
        resultEl.innerHTML =
            '<div class="random-feature">' +
                ui.imgFallback(C.ART + id + '.png', C.POKE_CDN + ('000' + id).slice(-3) + '.png', name) +
                '<div class="random-feature-info">' +
                    '<span class="poke-num-big">#' + U.pad4(id) + '</span>' +
                    '<h3>' + U.cap(name) + '</h3>' +
                    '<a class="btn-primary" href="#/pokemon/' + id + '">Ver ficha completa</a>' +
                '</div>' +
            '</div>';
    }

    async function randTeam(container) {
        var regionName = container.querySelector('#teamRegion').value;
        var noLegends = container.querySelector('#teamNoLegends').checked;
        var evolvedOnly = container.querySelector('#teamEvolved').checked;
        var resultEl = container.querySelector('#teamResult');

        var region = null;
        if (regionName !== '__all') {
            region = PW.regions.filter(function (r) { return r.name === regionName; })[0] || null;
        }

        resultEl.innerHTML = ui.loader('Construyendo equipo...');
        var chosen = [];
        if (!region) {
            if (noLegends || evolvedOnly) {
                resultEl.innerHTML = ui.empty('Para excluir legendarios o elegir solo evolucionados, selecciona una región concreta.');
                return;
            }
            var pool = await buildRandomPool(container, '__all');
            var ids = [];
            var guard = 0;
            while (ids.length < 6 && guard < 600) {
                guard++;
                var pp = pool[Math.floor(Math.random() * pool.length)];
                if (ids.indexOf(pp.id) === -1) ids.push(pp.id);
            }
            chosen = ids;
            showRandomTeam(resultEl, chosen);
            return;
        }
        try {
            var recs = await api.ensureRegionExtra(region, function () {});
            var candidates = recs.filter(function (r) {
                if (noLegends && (r.legendary || r.mythical)) return false;
                if (evolvedOnly && r.canEvolve) return false;
                return true;
            });
            if (candidates.length < 6) {
                resultEl.innerHTML = ui.empty('No hay suficientes Pokémon que cumplan los criterios en ' + region.name + '.');
                return;
            }
            var shuffled = candidates.slice().sort(function () { return Math.random() - 0.5; });
            chosen = shuffled.slice(0, 6).map(function (r) { return r.id; });
            showRandomTeam(resultEl, chosen);
        } catch (e) {
            resultEl.innerHTML = ui.error('No se pudo generar el equipo.');
        }
    }

    function showRandomTeam(resultEl, ids) {
        resultEl.innerHTML =
            '<div class="pokedex-grid mini">' + ids.map(function (id) {
                return ui.card({ id: id, name: nameOf(id) }, { compact: true });
            }).join('') + '</div>' +
            '<div class="center" style="margin-top:14px">' +
                '<button class="btn-primary" id="useTeamBtn">Usar este equipo en el Team Builder</button>' +
            '</div>';
        var btn = resultEl.querySelector('#useTeamBtn');
        if (btn) btn.addEventListener('click', function () {
            state.team = { ids: ids, name: '' };
            PW.router.navigate('#/teambuilder');
        });
    }

    /* ================= TEAM BUILDER ================= */

    PW.views.teambuilder = function (container) {
        state.team = state.team || { ids: [], name: '' };
        renderTeamBuilder(container);
    };

    function renderTeamBuilder(container) {
        var ids = state.team.ids || [];
        var savedTeams = store.getTeams();

        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Team Builder</h1>' +
                '<p class="subtitle">Construye tu equipo y analiza su cobertura de tipos</p>' +
            '</div></header>' +
            '<div class="panel">' +
                '<h3>Tu equipo (' + ids.length + '/6)</h3>' +
                '<div class="team-grid" id="teamSlots"></div>' +
                '<div class="team-actions">' +
                    '<span class="picker-wrap" id="teamPicker"></span>' +
                    '<button class="btn-secondary" id="teamClear">Vaciar</button>' +
                    '<button class="btn-primary" id="teamSave">Guardar equipo</button>' +
                '</div>' +
                (savedTeams.length
                    ? '<div class="team-actions" style="margin-top:10px"><label class="fgroup"><span>Cargar equipo</span>' +
                        '<select id="teamLoad"><option value="">Selecciona...</option>' +
                        savedTeams.map(function (t) {
                            return '<option value="' + t.id + '">' + U.esc(t.name) + ' (' + (t.ids || []).length + ')</option>';
                        }).join('') +
                        '</select></label>' +
                        '<button class="btn-secondary" id="teamDelete">Borrar seleccionado</button></div>'
                    : '') +
            '</div>' +
            '<div id="teamAnalysis"></div>';

        renderTeamSlots(container);

        pokemonPicker(container.querySelector('#teamPicker'), 'Añadir Pokémon al equipo...', function (id) {
            if (state.team.ids.indexOf(id) !== -1) { ui.toast('Ese Pokémon ya está en el equipo.'); return; }
            if (state.team.ids.length >= C.MAX_TEAM) { ui.toast('El equipo está completo (6 Pokémon).'); return; }
            state.team.ids.push(id);
            renderTeamBuilder(container);
        });

        container.querySelector('#teamClear').addEventListener('click', function () {
            state.team.ids = [];
            renderTeamBuilder(container);
        });

        container.querySelector('#teamSave').addEventListener('click', function () {
            if (!state.team.ids.length) { ui.toast('El equipo está vacío.'); return; }
            var name = prompt('Nombre para el equipo:', state.team.name || 'Mi equipo');
            if (name === null) return;
            state.team.name = name.trim() || 'Mi equipo';
            store.saveTeam({ name: state.team.name, ids: state.team.ids.slice() });
            ui.toast('Equipo guardado.');
            renderTeamBuilder(container);
        });

        var loadSel = container.querySelector('#teamLoad');
        if (loadSel) loadSel.addEventListener('change', function () {
            if (!loadSel.value) return;
            var t = store.getTeamById(loadSel.value);
            if (t) {
                state.team.ids = (t.ids || []).slice();
                state.team.name = t.name;
                renderTeamBuilder(container);
                ui.toast('Equipo cargado: ' + t.name);
            }
        });
        var delBtn = container.querySelector('#teamDelete');
        if (delBtn) delBtn.addEventListener('click', function () {
            if (!loadSel || !loadSel.value) { ui.toast('Selecciona un equipo primero.'); return; }
            store.deleteTeam(loadSel.value);
            ui.toast('Equipo borrado.');
            renderTeamBuilder(container);
        });
    }

    async function renderTeamSlots(container) {
        var slotsEl = container.querySelector('#teamSlots');
        var ids = state.team.ids || [];
        var recs = await Promise.all(ids.map(function (id) { return api.getCompact(id).catch(function () { return null; }); }));
        recs = recs.map(function (r, i) { return r || { id: ids[i], name: '???', types: [] }; });

        var slotsHtml = '';
        for (var i = 0; i < C.MAX_TEAM; i++) {
            var rec = recs[i];
            if (rec) {
                slotsHtml += '<div class="team-slot filled" data-idx="' + i + '">' +
                    '<button class="team-remove" data-id="' + rec.id + '" title="Quitar" aria-label="Quitar">&#10005;</button>' +
                    '<a href="#/pokemon/' + rec.id + '">' + ui.pokeImg(rec.id, rec.name) + '</a>' +
                    '<span class="team-name">' + U.cap(rec.name) + '</span>' +
                    '<div class="poke-types">' + (rec.types || []).map(U.typeChip).join('') + '</div>' +
                    '</div>';
            } else {
                slotsHtml += '<div class="team-slot empty"><span>+</span></div>';
            }
        }
        slotsEl.innerHTML = slotsHtml;

        slotsEl.querySelectorAll('.team-remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = parseInt(btn.dataset.id, 10);
                state.team.ids = state.team.ids.filter(function (x) { return x !== id; });
                renderTeamBuilder(container);
            });
        });

        var analysisEl = container.querySelector('#teamAnalysis');
        if (recs.length) {
            analysisEl.innerHTML = teamAnalysisHtml(recs);
        } else {
            analysisEl.innerHTML = '';
        }
    }

    function teamAnalysisHtml(members) {
        var weak = {}, resist = {}, immune = {}, neutral = {};
        PW.types.forEach(function (t) { weak[t] = 0; resist[t] = 0; immune[t] = 0; neutral[t] = 0; });
        members.forEach(function (m) {
            PW.types.forEach(function (atk) {
                var mult = U.effMultiplier(atk, m.types);
                if (mult === 0) immune[atk]++;
                else if (mult < 1) resist[atk]++;
                else if (mult > 1) weak[atk]++;
                else neutral[atk]++;
            });
        });

        var weakHtml = '', resistHtml = '', immuneHtml = '';
        PW.types.forEach(function (t) {
            if (weak[t] >= 3) {
                weakHtml += '<span class="ana-chip">' + U.typeChip(t) + '<small>x' + weak[t] + '</small></span>';
            }
        });
        PW.types.forEach(function (t) {
            if (resist[t] >= 3) {
                resistHtml += '<span class="ana-chip">' + U.typeChip(t) + '<small>x' + resist[t] + '</small></span>';
            }
        });
        PW.types.forEach(function (t) {
            if (immune[t] > 0) {
                immuneHtml += '<span class="ana-chip">' + U.typeChip(t) + '<small>x' + immune[t] + '</small></span>';
            }
        });

        /* Cobertura STAB */
        var stabSet = {};
        members.forEach(function (m) { (m.types || []).forEach(function (t) { stabSet[t] = true; }); });
        var stabHtml = Object.keys(stabSet).map(U.typeChip).join('');

        var avgTotal = Math.round(members.reduce(function (s, m) { return s + (m.total || 0); }, 0) / members.length);
        var speeds = members.map(function (m) { return m.stats ? m.stats.speed : 0; });
        var avgSpeed = Math.round(speeds.reduce(function (a, b) { return a + b; }, 0) / members.length);

        return '<div class="panel">' +
            '<h3>Análisis del equipo</h3>' +
            '<div class="team-stats-line">' +
                '<span class="chip">Total medio: ' + avgTotal + '</span>' +
                '<span class="chip">Velocidad media: ' + avgSpeed + '</span>' +
            '</div>' +
            (weakHtml ? '<div class="ana-block ana-weak"><span class="ana-label">3+ Pokémon débiles a</span>' +
                '<span class="ana-chips">' + weakHtml + '</span></div>' : '') +
            (resistHtml ? '<div class="ana-block ana-resist"><span class="ana-label">3+ Pokémon resisten</span>' +
                '<span class="ana-chips">' + resistHtml + '</span></div>' : '') +
            (immuneHtml ? '<div class="ana-block ana-immune"><span class="ana-label">Inmunidades</span>' +
                '<span class="ana-chips">' + immuneHtml + '</span></div>' : '') +
            (stabHtml ? '<div class="ana-block"><span class="ana-label">Cobertura STAB</span>' +
                '<span class="ana-chips">' + stabHtml + '</span></div>' : '') +
            '<p class="hint">Análisis orientativo basado únicamente en tipos y estadísticas base. No sustituye la estrategia real de combate.</p>' +
            '</div>';
    }

    /* ================= COMPARADOR ================= */

    PW.views.compare = function (container) {
        state.compare = state.compare || { ids: [] };
        renderCompare(container);
    };

    function renderCompare(container) {
        var ids = state.compare.ids || [];
        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Comparador de Pokémon</h1>' +
                '<p class="subtitle">Compara hasta ' + C.MAX_TEAM + ' Pokémon lado a lado</p>' +
            '</div></header>' +
            '<div class="panel">' +
                '<div class="team-actions"><span class="picker-wrap" id="cmpPicker"></span>' +
                '<button class="btn-secondary" id="cmpClear">Vaciar</button></div>' +
                '<div id="cmpMembers" class="mini-grid"></div>' +
            '</div>' +
            '<div id="cmpTable"></div>';

        pokemonPicker(container.querySelector('#cmpPicker'), 'Añadir Pokémon a comparar...', function (id) {
            if (state.compare.ids.indexOf(id) !== -1) { ui.toast('Ya está en la comparación.'); return; }
            if (state.compare.ids.length >= C.MAX_TEAM) { ui.toast('Máximo ' + C.MAX_TEAM + ' Pokémon.'); return; }
            state.compare.ids.push(id);
            renderCompare(container);
        });
        container.querySelector('#cmpClear').addEventListener('click', function () {
            state.compare.ids = [];
            renderCompare(container);
        });

        if (!ids.length) {
            var t = container.querySelector('#cmpTable');
            if (t) t.innerHTML = ui.empty('Añade al menos 2 Pokémon para comparar.');
            return;
        }

        var membersEl = container.querySelector('#cmpMembers');
        var tableEl = container.querySelector('#cmpTable');
        membersEl.innerHTML = ui.loader('Cargando Pokémon...');
        tableEl.innerHTML = '';

        Promise.all(ids.map(function (id) {
            return api.getCompact(id).catch(function () { return null; });
        })).then(function (recs) {
            var valid = recs.filter(Boolean);
            membersEl.innerHTML = valid.map(function (r) {
                return '<div class="cmp-member">' +
                    '<button class="team-remove" data-cmp-remove="' + r.id + '" title="Quitar">&#10005;</button>' +
                    '<a href="#/pokemon/' + r.id + '">' + ui.pokeImg(r.id, r.name) + '</a>' +
                    '<span>' + U.cap(r.name) + '</span>' +
                    '<div class="poke-types">' + r.types.map(U.typeChip).join('') + '</div>' +
                    '</div>';
            }).join('');

            membersEl.querySelectorAll('[data-cmp-remove]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = parseInt(btn.dataset.cmpRemove, 10);
                    state.compare.ids = state.compare.ids.filter(function (x) { return x !== id; });
                    renderCompare(container);
                });
            });

            if (valid.length < 2) {
                tableEl.innerHTML = ui.empty('Añade al menos 2 Pokémon para comparar.');
                return;
            }

            var statsOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
            var maxStat = 0;
            valid.forEach(function (r) {
                statsOrder.forEach(function (k) { if ((r.stats[k] || 0) > maxStat) maxStat = r.stats[k]; });
                if ((r.total || 0) > maxStat) maxStat = r.total;
                if ((r.height || 0) > maxStat) maxStat = r.height;
                if ((r.weight || 0) > maxStat) maxStat = r.weight;
            });

            function statRow(label, getter, fmt) {
                var cells = valid.map(function (r) {
                    var v = getter(r);
                    var pct = maxStat ? Math.min(100, v / maxStat * 100) : 0;
                    return '<td><span class="cmp-val">' + fmt(v) + '</span>' +
                        '<div class="stat-bar"><div class="stat-fill" style="width:' + pct + '%"></div></div></td>';
                }).join('');
                return '<tr><th scope="row">' + label + '</th>' + cells + '</tr>';
            }

            var head = '<tr><th></th>' + valid.map(function (r) {
                return '<th><a href="#/pokemon/' + r.id + '">' + U.cap(r.name) + '</a></th>';
            }).join('') + '</tr>';

            var rows = '';
            rows += '<tr><th scope="rowgroup" colspan="' + (valid.length + 1) + '" class="cmp-section">Tipos</th></tr>' +
                '<tr><th scope="row">Tipos</th>' + valid.map(function (r) {
                    return '<td><div class="poke-types">' + r.types.map(U.typeChip).join('') + '</div></td>';
                }).join('') + '</tr>';
            rows += '<tr><th scope="rowgroup" colspan="' + (valid.length + 1) + '" class="cmp-section">Estadísticas</th></tr>';
            statsOrder.forEach(function (k) {
                rows += statRow(PW.statEs[k], function (r) { return r.stats[k] || 0; }, function (v) { return v; });
            });
            rows += statRow('Total', function (r) { return r.total || 0; }, function (v) { return v; });
            rows += '<tr><th scope="rowgroup" colspan="' + (valid.length + 1) + '" class="cmp-section">Otros datos</th></tr>';
            rows += statRow('Altura (m)', function (r) { return r.height / 10; }, function (v) { return v.toFixed(1).replace('.', ','); });
            rows += statRow('Peso (kg)', function (r) { return r.weight / 10; }, function (v) { return v.toFixed(1).replace('.', ','); });
            rows += '<tr><th scope="row">Habilidades</th>' + valid.map(function (r) {
                return '<td>' + r.abilities.map(function (a) {
                    return '<div class="cmp-ab">' + U.cap(a.name.replace(/-/g, ' ')) + (a.hidden ? ' <em class="hidden-ab">(oculta)</em>' : '') + '</div>';
                }).join('') + '</td>';
            }).join('') + '</tr>';

            tableEl.innerHTML = '<div class="cmp-scroll"><table class="cmp-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
        });
    }

    /* ================= RANKINGS ================= */

    PW.views.rankings = function (container) {
        var region = state.dex.region || PW.regions[0];
        var regOpts = [PW.regionsAll].concat(PW.regions).map(function (r) {
            return '<option value="' + r.name + '"' + (r.name === region.name ? ' selected' : '') + '>' + U.esc(r.name) + '</option>';
        }).join('');
        var typeOpts = '<option value="">Cualquier tipo</option>' + PW.types.map(function (t) {
            return '<option value="' + t + '">' + U.esc(PW.typeEs[t]) + '</option>';
        }).join('');
        var statOpts = [
            ['hp', 'Mayor PS'], ['attack', 'Mayor Ataque'], ['defense', 'Mayor Defensa'],
            ['spa', 'Mayor Ataque Esp.'], ['spd', 'Mayor Defensa Esp.'], ['speed', 'Mayor Velocidad'],
            ['total', 'Mayor total de estadísticas'], ['weight', 'Más pesados'], ['height', 'Más altos']
        ].map(function (o) {
            return '<option value="' + o[0] + '">' + o[1] + '</option>';
        }).join('');

        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Rankings</h1>' +
                '<p class="subtitle">Los mejores Pokémon de cada estadística</p>' +
            '</div></header>' +
            '<div class="filterbar"><div class="filterbar-row">' +
                '<label class="fgroup"><span>Región</span><select id="rkRegion">' + regOpts + '</select></label>' +
                '<label class="fgroup"><span>Estadística</span><select id="rkStat">' + statOpts + '</select></label>' +
                '<label class="fgroup"><span>Tipo</span><select id="rkType">' + typeOpts + '</select></label>' +
                '<label class="fgroup"><span>Orden</span>' +
                    '<select id="rkDir"><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label>' +
                '<span class="filter-status" id="rkStatus"></span>' +
            '</div></div>' +
            '<div id="rkList">' + ui.loader('Cargando datos de la región...') + '</div>';

        var regionSel = container.querySelector('#rkRegion');
        var statSel = container.querySelector('#rkStat');
        var typeSel = container.querySelector('#rkType');
        var dirSel = container.querySelector('#rkDir');
        var statusEl = container.querySelector('#rkStatus');
        var listEl = container.querySelector('#rkList');

        function resolveRegion(name) {
            return [PW.regionsAll].concat(PW.regions).filter(function (r) { return r.name === name; })[0] || region;
        }

        function load() {
            var reg = resolveRegion(regionSel.value);
            listEl.innerHTML = ui.loader('Analizando Pokémon de ' + reg.name + '...');
            api.ensureRegionExtra(reg, function (st) {
                statusEl.innerHTML = '<span class="mini-progress-text">' + st.phase + ' ' + st.done + '/' + st.total + '</span>';
            }).then(function (recs) {
                statusEl.textContent = '';
                var stat = statSel.value;
                var type = typeSel.value;
                var dir = dirSel.value;
                var pool = type ? recs.filter(function (r) { return (r.types || []).indexOf(type) !== -1; }) : recs;
                var sorted = pool.slice().sort(function (a, b) {
                    var d = statOfRec(b, stat) - statOfRec(a, stat);
                    return dir === 'asc' ? -d : d;
                }).slice(0, 25);
                if (!sorted.length) {
                    listEl.innerHTML = ui.empty('No hay Pokémon que coincidan con el filtro.');
                    return;
                }
                var maxVal = Math.max.apply(null, sorted.map(function (r) { return statOfRec(r, stat); }));
                listEl.innerHTML = sorted.map(function (r, i) {
                    var v = statOfRec(r, stat);
                    var pct = maxVal ? Math.min(100, v / maxVal * 100) : 0;
                    var label = stat === 'weight' ? (v / 10).toFixed(1).replace('.', ',') + ' kg'
                        : stat === 'height' ? (v / 10).toFixed(1).replace('.', ',') + ' m'
                        : v;
                    return '<a class="rk-row" href="#/pokemon/' + r.id + '">' +
                        '<span class="rk-rank">' + (i + 1) + '</span>' +
                        ui.pokeImg(r.id, '') +
                        '<span class="rk-name">' + U.cap(r.name) + '</span>' +
                        '<span class="rk-bar-wrap"><span class="rk-bar" style="width:' + pct + '%"></span></span>' +
                        '<span class="rk-val">' + label + '</span>' +
                        '</a>';
                }).join('');
            }).catch(function () {
                statusEl.textContent = 'Error de conexión.';
                listEl.innerHTML = ui.error('No se pudieron cargar los rankings.');
            });
        }

        var STAT_MAP = { spa: 'special-attack', spd: 'special-defense' };
        function statOfRec(r, key) {
            if (key === 'total') return r.total != null ? r.total : -Infinity;
            if (key === 'weight') return r.weight != null ? r.weight : -Infinity;
            if (key === 'height') return r.height != null ? r.height : -Infinity;
            var mapped = STAT_MAP[key] || key;
            return r.stats ? (r.stats[mapped] != null ? r.stats[mapped] : -Infinity) : -Infinity;
        }

        regionSel.addEventListener('change', load);
        statSel.addEventListener('change', load);
        typeSel.addEventListener('change', load);
        dirSel.addEventListener('change', load);
        load();
    };

    /* ================= CALCULADORA DE DAÑO ================= */

    PW.views.damage = function (container) {
        container.innerHTML =
            '<header class="dex-header"><div>' +
                '<h1 class="page-title">Calculadora de daño</h1>' +
                '<p class="subtitle">Estima el daño de un movimiento en combate</p>' +
            '</div></header>' +
            '<div class="panel">' +
                '<h3>Configuración</h3>' +
                '<div class="calc-types">' +
                    '<div><label class="fgroup"><span>Atacante</span><span id="dmgAtk"></span></label></div>' +
                    '<div><label class="fgroup"><span>Defensor</span><span id="dmgDef"></span></label></div>' +
                '</div>' +
                '<div class="calc-types">' +
                    '<div><label class="fgroup"><span>Movimiento</span><span id="dmgMove"></span></label></div>' +
                    '<div><label class="fgroup"><span>Nivel atacante</span><input type="number" id="dmgLevelA" value="50" min="1" max="100"></label></div>' +
                    '<div><label class="fgroup"><span>Nivel defensor</span><input type="number" id="dmgLevelD" value="50" min="1" max="100"></label></div>' +
                '</div>' +
                '<p class="hint">Fórmula de la Generación 5+ (simplificada): usa estadísticas base, sin IV/EV, naturaleza ni objetos. La efectividad se calcula con la tabla de tipos moderna (Gen 6+).</p>' +
            '</div>' +
            '<div id="dmgResult"></div>';

        var model = { atk: null, def: null, move: null };

        pokemonPicker(container.querySelector('#dmgAtk'), 'Elegir atacante...', function (id) { model.atk = id; calc(); });
        pokemonPicker(container.querySelector('#dmgDef'), 'Elegir defensor...', function (id) { model.def = id; calc(); });
        movePicker(container.querySelector('#dmgMove'), 'Elegir movimiento...', function (name) { model.move = name; calc(); });

        container.querySelector('#dmgLevelA').addEventListener('input', calc);
        container.querySelector('#dmgLevelD').addEventListener('input', calc);

        async function calc() {
            var resultEl = container.querySelector('#dmgResult');
            if (!model.atk || !model.def || !model.move) {
                resultEl.innerHTML = ui.empty('Selecciona atacante, defensor y movimiento.');
                return;
            }
            resultEl.innerHTML = ui.loader('Calculando...');
            try {
                var atk = await api.getCompact(model.atk);
                var def = await api.getCompact(model.def);
                var mv = await api.get(C.API + 'move/' + model.move);
                var power = mv.power;
                var moveType = mv.type ? mv.type.name : null;
                var cat = mv.damage_class ? mv.damage_class.name : null;
                var levelA = parseInt(container.querySelector('#dmgLevelA').value, 10) || 50;
                var levelD = parseInt(container.querySelector('#dmgLevelD').value, 10) || 50;

                if (cat === 'status' || !power || power === 0) {
                    resultEl.innerHTML = ui.empty('Este movimiento no causa daño directo.');
                    return;
                }
                var isSpecial = cat === 'special';
                var aStat = isSpecial ? atk.stats['special-attack'] : atk.stats.attack;
                var dStat = isSpecial ? def.stats['special-defense'] : def.stats.defense;
                var stab = moveType && atk.types.indexOf(moveType) !== -1 ? 1.5 : 1;
                var eff = moveType ? U.effMultiplier(moveType, def.types) : 1;

                /* Fórmula Gen 5+: ((2*N/5+2)*Pot*A/D/50+2)*STAB*Efectividad*(0.85..1) */
                var base = Math.floor((Math.floor(2 * levelA / 5 + 2) * power * aStat / dStat) / 50) + 2;
                var mod = stab * eff;
                var min = Math.floor(base * mod * 0.85);
                var max = Math.floor(base * mod);
                var hpStat = def.stats.hp || 1;
                var pctMin = (min / hpStat * 100).toFixed(1).replace('.', ',');
                var pctMax = (max / hpStat * 100).toFixed(1).replace('.', ',');

                resultEl.innerHTML =
                    '<div class="panel dmg-panel">' +
                        '<h3>Resultado</h3>' +
                        '<div class="dmg-grid">' +
                            '<div class="dmg-cell"><small>Daño mínimo</small><strong>' + min + '</strong><span>≈ ' + pctMin + '% PS</span></div>' +
                            '<div class="dmg-cell"><small>Daño máximo</small><strong>' + max + '</strong><span>≈ ' + pctMax + '% PS</span></div>' +
                        '</div>' +
                        '<div class="dl-grid">' +
                            '<dt>Movimiento</dt><dd>' + U.cap(mv.name.replace(/-/g, ' ')) + '</dd>' +
                            '<dt>Tipo</dt><dd>' + (moveType ? U.typeChip(moveType) : '—') + '</dd>' +
                            '<dt>Categoría</dt><dd>' + U.cap(cat) + '</dd>' +
                            '<dt>Potencia</dt><dd>' + power + '</dd>' +
                            '<dt>STAB</dt><dd>' + (stab === 1.5 ? 'Sí (x1.5)' : 'No (x1)') + '</dd>' +
                            '<dt>Efectividad</dt><dd>x' + eff + '</dd>' +
                            '<dt>Ataque base</dt><dd>' + aStat + '</dd>' +
                            '<dt>Defensa base</dt><dd>' + dStat + '</dd>' +
                        '</div>' +
                        '<p class="hint">Valores aproximados. El resultado real varía con IV, EV, naturaleza, objetos y habilidades.</p>' +
                    '</div>';
            } catch (e) {
                resultEl.innerHTML = ui.error('No se pudo calcular el daño.');
            }
        }
    };

    /* ================= AYUDA ================= */

    PW.views.ayuda = function (container) {
        container.innerHTML =
            '<article id="ayuda" class="section">' +
            '<h2>Centro de ayuda</h2>' +
            '<p>¿Encontraste un error en la Pokepedia o un problema en la web? Cuéntanoslo a través del formulario y el equipo la revisará.</p>' +
            '<section id="reporte" class="panel">' +
                '<h3>Reportar un bug o error</h3>' +
                '<form id="bugForm" novalidate>' +
                    '<div class="form-group"><label for="nombre">Nombre de usuario</label>' +
                        '<input type="text" id="nombre" name="nombre" required placeholder="Tu nombre"><span class="error"></span></div>' +
                    '<div class="form-group"><label for="email">Correo electrónico</label>' +
                        '<input type="email" id="email" name="email" required placeholder="tucorreo@ejemplo.com"><span class="error"></span></div>' +
                    '<div class="form-row">' +
                        '<div class="form-group"><label for="tipo">Tipo de problema</label>' +
                            '<select id="tipo" name="tipo" required><option value="">Selecciona un tipo...</option>' +
                            '<option value="bug">Error en datos de un Pokémon</option>' +
                            '<option value="error">Error de sistema / la web no carga</option>' +
                            '<option value="busqueda">La búsqueda no funciona</option>' +
                            '<option value="cuenta">Problema con la cuenta</option>' +
                            '<option value="otro">Otro</option></select><span class="error"></span></div>' +
                        '<div class="form-group"><label for="navegador">Navegador / dispositivo</label>' +
                            '<select id="navegador" name="navegador" required><option value="">Selecciona...</option>' +
                            '<option value="chrome">Chrome</option><option value="firefox">Firefox</option>' +
                            '<option value="edge">Edge</option><option value="safari">Safari</option>' +
                            '<option value="movil">Móvil / tableta</option></select><span class="error"></span></div>' +
                    '</div>' +
                    '<div class="form-group"><label for="titulo">Título del reporte</label>' +
                        '<input type="text" id="titulo" name="titulo" required placeholder="Ej.: Bulbasaur muestra el tipo incorrecto"><span class="error"></span></div>' +
                    '<div class="form-group"><label for="descripcion">Descripción del problema</label>' +
                        '<textarea id="descripcion" name="descripcion" rows="5" required placeholder="Describe qué ocurrió y los pasos para reproducirlo..."></textarea><span class="error"></span></div>' +
                    '<div class="form-group"><label for="archivo">Adjuntar captura (opcional)</label>' +
                        '<input type="file" id="archivo" name="archivo" accept="image/*"><span class="error"></span></div>' +
                    '<div class="form-actions">' +
                        '<button type="submit" class="btn-primary">Enviar reporte</button>' +
                        '<button type="reset" class="btn-secondary">Limpiar</button>' +
                    '</div>' +
                '</form>' +
                '<div id="formResult" class="result" hidden></div>' +
            '</section>' +
            '<section id="faq" class="panel"><h3>Preguntas frecuentes</h3>' +
                '<details><summary>¿De dónde salen los datos?</summary><p>Los datos provienen de la PokéAPI (pokeapi.co), una API pública y gratuita. La Pokepedia es una fan page sin fines comerciales.</p></details>' +
                '<details><summary>¿Necesito conexión a internet?</summary><p>Sí. La Pokédex completa se carga desde la PokéAPI, por lo que necesitas conexión para ver los datos e imágenes.</p></details>' +
                '<details><summary>¿Se guardan mis datos?</summary><p>Solo localmente en tu navegador: favoritos, historial y equipos se guardan en tu dispositivo mediante LocalStorage. No se envía nada a ningún servidor.</p></details>' +
                '<details><summary>¿Qué regiones incluye la Pokédex?</summary><p>Kanto, Johto, Hoenn, Sinnoh, Teselia, Kalos, Alola, Galar y Paldea, en orden de la Pokédex Nacional.</p></details>' +
                '<details><summary>¿Por qué los nombres aparecen en inglés en la Pokédex?</summary><p>La lista masiva de la PokéAPI entrega nombres en inglés. El nombre en español se muestra en la ficha completa de cada Pokémon, ya que consultar 1.000+ nombres localizados ralentizaría la web.</p></details>' +
            '</section>' +
            '</article>';

        initBugForm(container);
    };

    function initBugForm(container) {
        var bugForm = container.querySelector('#bugForm');
        var formResultEl = container.querySelector('#formResult');

        function validateField(field) {
            var group = field.closest('.form-group');
            var error = group.querySelector('.error');
            var valid = true;
            var msg = '';
            if (field.hasAttribute('required')) {
                if (field.type === 'email' && field.value.trim() !== '') {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
                        valid = false; msg = 'Ingresa un correo electrónico válido.';
                    }
                } else if (field.value.trim() === '') {
                    valid = false; msg = 'Este campo es obligatorio.';
                }
            }
            if (field.id === 'nombre' && field.value.trim() !== '' && field.value.trim().length < 2) {
                valid = false; msg = 'El nombre debe tener al menos 2 caracteres.';
            }
            if (field.id === 'titulo' && field.value.trim() !== '' && field.value.trim().length < 5) {
                valid = false; msg = 'El título debe tener al menos 5 caracteres.';
            }
            if (field.tagName === 'TEXTAREA' && field.value.trim() !== '' && field.value.trim().length < 20) {
                valid = false; msg = 'Describe el problema con al menos 20 caracteres.';
            }
            group.classList.toggle('invalid', !valid);
            if (error) error.textContent = valid ? '' : msg;
            return valid;
        }

        bugForm.querySelectorAll('input, select, textarea').forEach(function (field) {
            field.addEventListener('blur', function () {
                if (this.value.trim() !== '') validateField(this);
            });
            field.addEventListener('input', function () {
                if (this.closest('.form-group').classList.contains('invalid')) validateField(this);
            });
        });

        bugForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var fields = bugForm.querySelectorAll('[required]');
            var allValid = true;
            fields.forEach(function (field) {
                if (!validateField(field)) allValid = false;
            });
            if (!allValid) {
                ui.toast('Revisa los campos marcados en rojo.');
                var firstInvalid = bugForm.querySelector('.form-group.invalid input, .form-group.invalid select, .form-group.invalid textarea');
                if (firstInvalid) firstInvalid.focus();
                return;
            }
            var ticket = 'PK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
            formResultEl.hidden = false;
            formResultEl.className = 'result success';
            formResultEl.innerHTML =
                'Reporte enviado con éxito. Tu número de ticket es <strong>' + ticket + '</strong>.<br>' +
                'El equipo revisará el problema y te responderá a la brevedad.';
            formResultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            ui.toast('Reporte enviado correctamente.');
            bugForm.reset();
        });

        bugForm.addEventListener('reset', function () {
            formResultEl.hidden = true;
            bugForm.querySelectorAll('.form-group.invalid').forEach(function (g) {
                g.classList.remove('invalid');
                var error = g.querySelector('.error');
                if (error) error.textContent = '';
            });
        });
    }
})();
