/* =========================================================================
   Pokepedia — API: fetch con caché, listas y cargador de datos compactos
   ========================================================================= */

PW.api = (function () {
    'use strict';

    var cache = {};          /* caché en memoria de respuestas de la API */
    var nationalPromise = null;
    var compactPromises = {};/* id -> promesa de dato compacto */
    var listPromises = {};   /* 'moves' | 'abilities' | 'items' | 'berries' -> promesa */
    var regionExtraCache = {}; /* nombre región -> array compacto (en memoria) */

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    /* GET con reintentos con retroceso exponencial. Solo se cachean las
       respuestas correctas; un fallo de red o 429/5xx se reintenta. */
    function get(url, tries) {
        tries = tries || 3;
        if (cache[url]) return Promise.resolve(cache[url]);
        return attempt(1);
        function attempt(n) {
            return fetch(url).then(function (r) {
                if (r.ok) {
                    return r.json().then(function (data) {
                        cache[url] = data;
                        return data;
                    });
                }
                if ((r.status === 429 || r.status >= 500) && n < tries) {
                    return wait(400 * n).then(function () { return attempt(n + 1); });
                }
                throw new Error('HTTP ' + r.status + ' en ' + url);
            }, function (err) {
                if (n < tries) return wait(400 * n).then(function () { return attempt(n + 1); });
                throw err;
            });
        }
    }

    /* Ejecuta tareas con límite de concurrencia */
    function runPool(items, concurrency, worker) {
        return new Promise(function (resolve) {
            var i = 0, active = 0, total = items.length, results = [];
            function next() {
                while (active < concurrency && i < total) {
                    (function (idx) {
                        active++;
                        Promise.resolve().then(function () { return worker(items[idx], idx); })
                            .then(function (r) { results[idx] = r; })
                            .catch(function () { results[idx] = null; })
                            .then(function () { active--; next(); });
                    })(i++);
                }
                if (active === 0 && i >= total) resolve(results);
            }
            next();
        });
    }

    /* ---------- Lista nacional ---------- */
    function getNational() {
        if (nationalPromise) return nationalPromise;
        nationalPromise = get(PW.config.API + 'pokemon?limit=3000&offset=0')
            .then(function (data) {
                var all = data.results.map(function (p) {
                    return { id: PW.utils.idFromUrl(p.url), name: p.name };
                });
                all.sort(function (a, b) { return a.id - b.id; });
                return all;
            });
        return nationalPromise;
    }

    function byIdOrName(all, id, name) {
        return all.filter(function (p) { return p.id === id || p.name === name; })[0] || null;
    }

    /* ---------- Dato compacto de un Pokémon (pokemon + species) ---------- */
    function getCompact(id) {
        if (compactPromises[id]) return compactPromises[id];
        compactPromises[id] = Promise.all([
            get(PW.config.API + 'pokemon/' + id),
            get(PW.config.API + 'pokemon-species/' + id)
        ]).then(function (pair) {
            var p = pair[0], s = pair[1];
            var stats = {};
            var total = 0;
            p.stats.forEach(function (st) {
                stats[st.stat.name] = st.base_stat;
                total += st.base_stat;
            });
            return {
                id: id,
                name: p.name,
                types: p.types.map(function (t) { return t.type.name; }),
                stats: stats,
                total: total,
                height: p.height,
                weight: p.weight,
                abilities: p.abilities.map(function (a) {
                    return { name: a.ability.name, hidden: a.is_hidden };
                }),
                legendary: !!s.is_legendary,
                mythical: !!s.is_mythical,
                eggGroups: s.egg_groups.map(function (g) { return g.name; }),
                captureRate: s.capture_rate,
                genderRate: s.gender_rate,
                baseExperience: p.base_experience,
                baseHappiness: s.base_happiness,
                starter: PW.curated.starters.indexOf(id) !== -1,
                fossil: PW.curated.fossils.indexOf(id) !== -1,
                evolutionUrl: s.evolution_chain ? s.evolution_chain.url : null,
                speciesUrl: s.url,
                canEvolve: false,
                hasPrevo: false
            };
        });
        return compactPromises[id];
    }

    /* ---------- Cadenas evolutivas: rellena canEvolve / hasPrevo ---------- */
    function fetchChainsFor(records, progress) {
        var urls = {};
        records.forEach(function (r) {
            if (r.evolutionUrl) urls[r.evolutionUrl] = true;
        });
        var chainUrls = Object.keys(urls);
        var fetched = 0;
        return runPool(chainUrls, 6, function (url) {
            return get(url).then(function (data) {
                /* mapa nombre -> lista de hijos */
                var parentMap = {};
                (function walk(node) {
                    if (node.evolves_to && node.evolves_to.length) {
                        parentMap[node.species.name] = node.evolves_to.map(function (c) { return c.species.name; });
                        node.evolves_to.forEach(walk);
                    }
                })(data.chain);
                return { url: url, parentMap: parentMap };
            }).then(function (res) {
                fetched++;
                if (progress) progress(fetched, chainUrls.length);
                return res;
            });
        }).then(function (chains) {
            var map = {};
            chains.forEach(function (c) { if (c) map[c.url] = c.parentMap; });
            records.forEach(function (r) {
                var pm = r.evolutionUrl ? map[r.evolutionUrl] : null;
                if (!pm) return;
                var hasPrevo = false, canEvolve = false;
                Object.keys(pm).forEach(function (parent) {
                    if (pm[parent].indexOf(r.name) !== -1) hasPrevo = true;
                });
                if (pm[r.name] && pm[r.name].length) canEvolve = true;
                r.hasPrevo = hasPrevo;
                r.canEvolve = canEvolve;
            });
            return records;
        });
    }

    function idsForRegion(region) {
        var ids = [];
        for (var i = region.start; i <= region.end; i++) ids.push(i);
        return ids;
    }

    /* ---------- Carga perezosa de datos extra de una región ----------
       Devuelve array compacto; llama a progress({done,total,msg}) mientras carga. */
    function ensureRegionExtra(region, progress) {
        var key = PW.config.EXTRA_PREFIX + region.name;
        if (regionExtraCache[region.name]) return Promise.resolve(regionExtraCache[region.name]);

        var ids = idsForRegion(region);
        var stored = PW.store.read(key) || [];
        var known = {};
        stored.forEach(function (r) { known[r.id] = r; });

        var missing = ids.filter(function (id) { return !known[id]; });

        if (missing.length === 0) {
            var merged = ids.map(function (id) { return known[id]; }).filter(Boolean);
            regionExtraCache[region.name] = merged;
            return Promise.resolve(merged);
        }

        var fetched = 0;
        var progressCb = progress || function () {};

        return runPool(missing, 8, function (id) {
            return getCompact(id);
        }).then(function (recs) {
            recs.forEach(function (r) {
                if (r) {
                    known[r.id] = r;
                    fetched++;
                    progressCb({ done: fetched, total: missing.length, phase: 'species' });
                }
            });
            var records = ids.map(function (id) { return known[id]; }).filter(Boolean);
            return fetchChainsFor(records, function (d, t) {
                progressCb({ done: d, total: t, phase: 'chains' });
            });
        }).then(function (records) {
            PW.store.write(key, records);
            regionExtraCache[region.name] = records;
            return records;
        });
    }

    /* ---------- Listas de nombres para bases de datos y búsqueda global ---------- */
    var LIST_NAMES = {
        moves: { url: 'move', limit: 1200 },
        abilities: { url: 'ability', limit: 400 },
        items: { url: 'item', limit: 2500 },
        berries: { url: 'berry', limit: 100 },
        types: { url: 'type', limit: 25 },
        itemCategories: { url: 'item-category', limit: 100 }
    };

    function getList(key) {
        if (listPromises[key]) return listPromises[key];
        var cfg = LIST_NAMES[key];
        listPromises[key] = get(PW.config.API + cfg.url + '?limit=' + cfg.limit + '&offset=0')
            .then(function (data) {
                return data.results.map(function (x) {
                    return { name: x.name, url: x.url };
                });
            });
        return listPromises[key];
    }

    function getItemDetail(name) {
        return get(PW.config.API + 'item/' + name);
    }
    function getBerryDetail(name) {
        return get(PW.config.API + 'berry/' + name);
    }
    function getTypeDetail(name) {
        return get(PW.config.API + 'type/' + name);
    }
    function getRegionDetail(name) {
        return get(PW.config.API + 'region/' + name);
    }

    /* ----------------------------------------------------------------------
       Encuentros de un Pokémon y mapeo área -> región
       ---------------------------------------------------------------------- */

    var locToRegion = {};      /* nombre de location -> nombre api de región */
    var regionMapPromise = null;
    var VERSION_GROUP = {
        red: 'red-blue', blue: 'red-blue', yellow: 'yellow',
        gold: 'gold-silver', silver: 'gold-silver', crystal: 'crystal',
        ruby: 'ruby-sapphire', sapphire: 'ruby-sapphire', emerald: 'emerald',
        firered: 'fire-red-leaf-green', leafgreen: 'fire-red-leaf-green',
        diamond: 'diamond-pearl', pearl: 'diamond-pearl', platinum: 'platinum',
        heartgold: 'heartgold-soulsilver', soulsilver: 'heartgold-soulsilver',
        black: 'black-white', white: 'black-white',
        'black-2': 'black-2-white-2', 'white-2': 'black-2-white-2',
        x: 'x-y', y: 'x-y',
        'omega-ruby': 'omega-ruby-alpha-sapphire', 'alpha-sapphire': 'omega-ruby-alpha-sapphire',
        sun: 'sun-moon', moon: 'sun-moon',
        'ultra-sun': 'ultra-sun-ultra-moon', 'ultra-moon': 'ultra-sun-ultra-moon',
        'lets-go-pikachu': 'lets-go-pikachu-lets-go-eevee',
        'lets-go-eevee': 'lets-go-pikachu-lets-go-eevee',
        sword: 'sword-shield', shield: 'sword-shield',
        'brilliant-diamond': 'brilliant-diamond-shining-pearl',
        'shining-pearl': 'brilliant-diamond-shining-pearl',
        'legends-arceus': 'legends-arceus',
        scarlet: 'scarlet-violet', violet: 'scarlet-violet',
        colosseum: 'colosseum', xd: 'xd'
    };

    function versionGroupOf(v) {
        return VERSION_GROUP[v] || v;
    }

    function regionLabel(apiName) {
        if (!apiName) return 'Desconocida';
        var i = PW.regionByApi[apiName];
        return i != null ? PW.regions[i].name : PW.utils.cap(apiName);
    }

    /* Heurística de respaldo: si no se pudo mapear el área, se intenta por prefijo */
    function guessRegion(areaName) {
        var a = (areaName || '').toLowerCase();
        var keys = ['paldea', 'galar', 'alola', 'kalos', 'unova', 'sinnoh', 'hoenn', 'johto', 'kanto'];
        for (var i = 0; i < keys.length; i++) {
            if (a.indexOf(keys[i] + '-') === 0) return keys[i];
        }
        return null;
    }

    /* Carga (una sola vez) todas las locations de cada región para poder
       traducir área -> location -> región sin llamadas extra por Pokémon. */
    function ensureRegionAreaMap() {
        if (regionMapPromise) return regionMapPromise;
        regionMapPromise = runPool(PW.regions.map(function (r) { return r.api; }), 6, function (apiName) {
            return get(PW.config.API + 'region/' + apiName).then(function (data) {
                return data.locations.map(function (l) { return { location: l.name, region: apiName }; });
            }, function () { return []; });
        }).then(function (lists) {
            lists.forEach(function (list) {
                list.forEach(function (x) { locToRegion[x.location] = x.region; });
            });
            return locToRegion;
        });
        return regionMapPromise;
    }

    function areaEsName(locName, areaName) {
        var key = locName || areaName;
        var t = PW.dicts.towns[key];
        if (t) return t;
        if (locName) {
            var t2 = PW.dicts.towns[locName];
            if (t2) return t2;
        }
        var base = (areaName || '').replace(/-area$/, '').replace(/-/g, ' ');
        return PW.utils.cap(base);
    }

    /* Encuentros: devuelve [{ region, regionEs, area, areaEs, details:[{ version, group, groupEs, encounters:[{method,methodEs,min,max,chance}] }] }] */
    function getEncounters(id) {
        return get(PW.config.API + 'pokemon/' + id + '/encounters').catch(function () {
            return [];
        }).then(function (list) {
            if (!list || !list.length) return [];
            var seen = {}, names = [];
            list.forEach(function (x) {
                if (x.location_area && !seen[x.location_area.name]) {
                    seen[x.location_area.name] = true;
                    names.push(x.location_area.name);
                }
            });
            return ensureRegionAreaMap().then(function () {
                return runPool(names, 8, function (areaName) {
                    return get(PW.config.API + 'location-area/' + areaName).then(function (d) {
                        return { area: areaName, location: d.location ? d.location.name : null };
                    }, function () { return { area: areaName, location: null }; });
                });
            }).then(function (mappings) {
                var map = {};
                mappings.forEach(function (m) { if (m) map[m.area] = m.location; });
                return list.map(function (x) {
                    var area = x.location_area.name;
                    var locName = map[area] || null;
                    var region = locName ? (locToRegion[locName] || guessRegion(area)) : guessRegion(area);
                    var details = (x.version_details || []).map(function (vd) {
                        var group = versionGroupOf(vd.version.name);
                        return {
                            version: vd.version.name,
                            group: group,
                            groupEs: PW.dicts.versionGroups[group] ||
                                PW.dicts.versionGroups[vd.version.name] ||
                                PW.utils.cap(vd.version.name.replace(/-/g, ' ')),
                            encounters: (vd.encounter_details || []).map(function (ed) {
                                return {
                                    method: ed.method.name,
                                    methodEs: PW.dicts.encounterMethods[ed.method.name] ||
                                        PW.utils.cap(ed.method.name.replace(/-/g, ' ')),
                                    min: ed.min_level,
                                    max: ed.max_level,
                                    chance: ed.chance
                                };
                            })
                        };
                    });
                    return {
                        region: region,
                        regionEs: regionLabel(region),
                        area: area,
                        areaEs: areaEsName(locName, area),
                        details: details
                    };
                });
            }).then(function (out) {
                out.sort(function (a, b) {
                    var ia = a.region != null ? (PW.regionByApi[a.region] != null ? PW.regionByApi[a.region] : 99) : 99;
                    var ib = b.region != null ? (PW.regionByApi[b.region] != null ? PW.regionByApi[b.region] : 99) : 99;
                    if (ia !== ib) return ia - ib;
                    return (a.areaEs || '').localeCompare(b.areaEs || '');
                });
                return out;
            });
        });
    }

    /* Nombre en español del detalle de un recurso (moves, abilities, etc.) */
    function esName(detail) {
        if (!detail || !detail.names) return null;
        return PW.utils.findLocalized(detail.names, 'name') || null;
    }

    /* ---------- Búsqueda global en listas ya cargadas ---------- */
    function globalSearch(term) {
        term = term.toLowerCase();
        return Promise.all([
            getNational(),
            getList('moves'),
            getList('abilities'),
            getList('items')
        ]).then(function (res) {
            function matches(list) {
                return list.filter(function (x) {
                    return x.name.indexOf(term) !== -1;
                }).slice(0, 5);
            }
            return {
                pokemon: matches(res[0]),
                moves: matches(res[1]),
                abilities: matches(res[2]),
                items: matches(res[3])
            };
        });
    }

    return {
        get: get,
        runPool: runPool,
        getNational: getNational,
        getCompact: getCompact,
        ensureRegionExtra: ensureRegionExtra,
        getList: getList,
        getItemDetail: getItemDetail,
        getBerryDetail: getBerryDetail,
        getTypeDetail: getTypeDetail,
        getRegionDetail: getRegionDetail,
        getEncounters: getEncounters,
        ensureRegionAreaMap: ensureRegionAreaMap,
        esName: esName,
        globalSearch: globalSearch,
        idsForRegion: idsForRegion
    };
})();
